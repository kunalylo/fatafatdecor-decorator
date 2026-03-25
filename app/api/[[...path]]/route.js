// ============================================================
// FatafatDecor API - Decorator App Route Handler
// ============================================================
//
// TABLE OF CONTENTS:
//   1.  SETUP & HELPERS         - DB connection, CORS, utilities
//   2.  AUTH EMAIL              - POST /auth/register, POST /auth/login
//   3.  AUTH GOOGLE             - POST /auth/google
//   4.  CITIES MANAGEMENT       - GET/POST /cities, PUT/DELETE /cities/:id, POST /city-check
//   5.  ITEMS                   - GET/POST /items, PUT/DELETE /items/:id
//   6.  RENT ITEMS              - GET /rent-items
//   7.  KITS                    - GET/POST /kits, PUT/DELETE /kits/:id
//                                 GET /kits/match, POST /kits/analyze
//                                 GET/POST /kits/reference-images, DELETE /kits/reference-images/:id
//   8.  DESIGNS                 - POST /designs/generate, GET /designs, GET /designs/:id
//   9.  ORDERS                  - POST /orders, GET /orders, GET /orders/:id
//  10.  PAYMENTS                - POST /payments/create-order, POST /payments/verify
//  11.  DELIVERY SLOTS          - GET /delivery/slots, POST /delivery/book
//                                 POST /delivery/update-location, GET /delivery/track/:id
//                                 POST /delivery/status
//  12.  CREDITS                 - GET /credits/:userId
//  13.  DELIVERY PERSONS        - GET/POST /delivery-persons, PUT /delivery-persons/:id
//  14.  USER LOCATION           - POST /user/location
//  15.  IMAGEKIT                - GET /imagekit/reference, POST /imagekit/upload
//  16.  DECORATOR APP (DP)      - POST /dp/login, GET /dp/dashboard/:id
//                                 GET /dp/calendar/:id, GET /dp/orders/:id
//                                 POST /dp/generate-otp, POST /dp/face-scan
//                                 POST /dp/verify-otp, POST /dp/complete
//                                 POST /dp/collect-payment, POST /dp/deposit-cash
//                                 GET /dp/earnings/:id, POST /dp/update-status
//                                 POST /dp/accept-order, POST /dp/decline-order
//                                 GET /dp/order-detail/:id
//  17.  SEED                    - GET/POST /seed
// ============================================================

import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

let client, db

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'
const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL || 'https://ik.imagekit.io/jcp2urr7b'

function getImageKitFolder(budget_min, budget_max) {
  const avg = (Number(budget_min) + Number(budget_max)) / 2
  if (avg <= 5000)  return 'dataset/3-5k'
  if (avg <= 10000) return 'dataset/5-10k'
  if (avg <= 20000) return 'dataset/10-20k'
  if (avg <= 30000) return 'dataset/20-30k'
  if (avg <= 50000) return 'dataset/30-50k'
  return 'dataset/50k-above'
}

async function connectToMongo() {
  if (client && db) return db
  try {
    const mongoUrl = process.env.MONGO_URL
    if (!mongoUrl) throw new Error('MONGO_URL not set in .env.local')
    client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 })
    await client.connect()
    db = client.db(process.env.DB_NAME || 'fatafatdecor')
    return db
  } catch (e) {
    client = null; db = null
    throw new Error('MongoDB connection failed: ' + e.message)
  }
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

function ok(data) { return cors(NextResponse.json(data)) }
function err(msg, status = 400) { return cors(NextResponse.json({ error: msg }, { status })) }
function hashPwd(pwd) { return crypto.createHash('sha256').update(pwd).digest('hex') }
function hashOtp(otp) { return crypto.createHash('sha256').update(`signup:${otp}`).digest('hex') }
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function isCityAllowed(db, city) {
  if (!city) return false
  const cityDoc = await db.collection('allowed_cities').findOne({
    name: { $regex: new RegExp('^' + escapeRegex(city.trim()) + '$', 'i') },
    active: true
  })
  return !!cityDoc
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const method = request.method
  try {
    const db = await connectToMongo()

    if ((path.length === 0 || (path.length === 1 && (path[0] === 'root' || path[0] === ''))) && method === 'GET') {
      return ok({ message: 'FatafatDecor API v2.0', status: 'running' })
    }

    // ====== AUTH EMAIL ======
    if (path[0] === 'auth' && path[1] === 'register' && method === 'POST') {
      const body = await request.json()
      const { name, email, phone, password, role } = body
      if (!name || !email || !password) return err('Name, email, password required')
      const existing = await db.collection('users').findOne({ email })
      if (existing) return err('Email already registered')
      const user = {
        id: uuidv4(), name, email, phone: phone || '',
        password: hashPwd(password), role: role || 'user',
        credits: 3, has_purchased_credits: false,
        location: null, city: body.city || null,
        auth_provider: 'email', created_at: new Date()
      }
      await db.collection('users').insertOne(user)
      const { password: _, _id, ...safeUser } = user
      return ok(safeUser)
    }

    if (path[0] === 'auth' && path[1] === 'login' && method === 'POST') {
      const { email, password } = await request.json()
      if (!email || !password) return err('Email and password required')
      const user = await db.collection('users').findOne({ email, password: hashPwd(password) })
      if (!user) return err('Invalid credentials', 401)
      const { password: _, _id, ...safeUser } = user
      return ok(safeUser)
    }

    // ====== AUTH GOOGLE ======
    if (path[0] === 'auth' && path[1] === 'google' && method === 'POST') {
      const { google_id, email, name, photo_url, city } = await request.json()
      if (!google_id || !email) return err('google_id and email required')
      let user = await db.collection('users').findOne({ $or: [{ google_id }, { email }] })
      if (!user) {
        user = {
          id: uuidv4(), name: name || email.split('@')[0], email,
          phone: '', password: null, role: 'user',
          credits: 3, has_purchased_credits: false,
          location: null, city: city || null,
          google_id, photo_url: photo_url || null,
          auth_provider: 'google', created_at: new Date()
        }
        await db.collection('users').insertOne(user)
      } else if (!user.google_id) {
        await db.collection('users').updateOne({ id: user.id }, { $set: { google_id, photo_url, auth_provider: 'google' } })
        user = { ...user, google_id, photo_url }
      }
      const { password: _, _id, ...safeUser } = user
      return ok(safeUser)
    }

    // ====== CITIES MANAGEMENT ======
    if (path[0] === 'cities' && method === 'GET') {
      const cities = await db.collection('allowed_cities').find({}).sort({ name: 1 }).toArray()
      return ok(cities.map(({ _id, ...c }) => c))
    }
    if (path[0] === 'cities' && !path[1] && method === 'POST') {
      const { name, state } = await request.json()
      if (!name) return err('City name required')
      const existing = await db.collection('allowed_cities').findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } })
      if (existing) return err('City already exists')
      const city = { id: uuidv4(), name: name.trim(), state: state || '', active: true, created_at: new Date() }
      await db.collection('allowed_cities').insertOne(city)
      const { _id, ...clean } = city
      return ok(clean)
    }
    if (path[0] === 'cities' && path[1] && method === 'PUT') {
      const body = await request.json(); delete body._id
      await db.collection('allowed_cities').updateOne({ id: path[1] }, { $set: body })
      const city = await db.collection('allowed_cities').findOne({ id: path[1] })
      if (!city) return err('City not found', 404)
      const { _id, ...clean } = city; return ok(clean)
    }
    if (path[0] === 'cities' && path[1] && method === 'DELETE') {
      await db.collection('allowed_cities').deleteOne({ id: path[1] })
      return ok({ success: true })
    }
    if (path[0] === 'city-check' && method === 'POST') {
      const { city } = await request.json()
      const allowed = await isCityAllowed(db, city)
      const cities = await db.collection('allowed_cities').find({ active: true }).sort({ name: 1 }).toArray()
      return ok({ allowed, city, active_cities: cities.map(c => c.name) })
    }

    // ====== ITEMS ======
    if (path[0] === 'items' && !path[1] && method === 'GET') {
      const url = new URL(request.url)
      const category = url.searchParams.get('category')
      const query = {}; if (category) query.category = category
      const items = await db.collection('items').find(query).toArray()
      return ok(items.map(({ _id, ...item }) => item))
    }
    if (path[0] === 'items' && !path[1] && method === 'POST') {
      const body = await request.json()
      const item = { id: uuidv4(), name: body.name, description: body.description || '', category: body.category || 'general', price: Number(body.selling_price_unit || body.price || 0), selling_price_unit: Number(body.selling_price_unit || body.price || 0), unit_cost: Number(body.unit_cost || 0), color: body.color || '', size: body.size || '', image_url: body.image_url || '', stock_count: Number(body.stock_count) || 0, tags: body.tags || [], is_rentable: body.is_rentable || false, is_sellable: body.is_sellable !== false, active: true, created_at: new Date() }
      await db.collection('items').insertOne(item)
      const { _id, ...clean } = item; return ok(clean)
    }
    if (path[0] === 'items' && path[1] && path[1] !== 'bulk' && method === 'PUT') {
      const body = await request.json(); delete body._id
      await db.collection('items').updateOne({ id: path[1] }, { $set: body })
      const item = await db.collection('items').findOne({ id: path[1] })
      if (!item) return err('Item not found', 404)
      const { _id, ...clean } = item; return ok(clean)
    }
    if (path[0] === 'items' && path[1] && method === 'DELETE') {
      await db.collection('items').deleteOne({ id: path[1] }); return ok({ success: true })
    }

    // ====== RENT ITEMS ======
    if (path[0] === 'rent-items' && method === 'GET') {
      const items = await db.collection('rent_items').find({}).toArray()
      return ok(items.map(({ _id, ...i }) => i))
    }

    // ====== KITS ======
    if (path[0] === 'kits' && !path[1] && method === 'GET') {
      const url = new URL(request.url)
      const occasion = url.searchParams.get('occasion')
      const query = {}; if (occasion) query.occasion_tags = occasion
      const kits = await db.collection('decoration_kits').find(query).sort({ created_at: -1 }).toArray()
      return ok(kits.map(({ _id, ...k }) => k))
    }
    if (path[0] === 'kits' && path[1] && !['match','analyze','reference-images'].includes(path[1]) && method === 'GET') {
      const kit = await db.collection('decoration_kits').findOne({ id: path[1] })
      if (!kit) return err('Kit not found', 404)
      const { _id, ...clean } = kit; return ok(clean)
    }
    if (path[0] === 'kits' && !path[1] && method === 'POST') {
      const body = await request.json()
      if (!body.name) return err('Kit name required')
      const kit = { id: uuidv4(), name: body.name, description: body.description || '', occasion_tags: body.occasion_tags || [], room_types: body.room_types || [], reference_images: body.reference_images || [], kit_items: body.kit_items || [], bom: body.bom || [], labor_cost: Number(body.labor_cost) || 0, travel_cost: Number(body.travel_cost) || 500, total_items_cost: 0, final_price: Number(body.final_price) || 0, selling_total: Number(body.selling_total || body.final_price) || 0, purchase_total: Number(body.purchase_total) || 0, setup_time_minutes: Number(body.setup_time_minutes) || 60, difficulty: body.difficulty || 'medium', color_theme: body.color_theme || '', notes: body.notes || '', is_active: body.is_active !== false, active: body.active !== false, kit_code: body.kit_code || '', theme: body.theme || '', audience: body.audience || '', created_at: new Date(), updated_at: new Date() }
      kit.total_items_cost = (kit.kit_items || []).reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0)
      if (!kit.final_price) kit.final_price = kit.total_items_cost + kit.labor_cost + kit.travel_cost
      if (!kit.selling_total) kit.selling_total = kit.final_price
      await db.collection('decoration_kits').insertOne(kit)
      const { _id, ...clean } = kit; return ok(clean)
    }
    if (path[0] === 'kits' && path[1] && !['match','analyze','reference-images'].includes(path[1]) && method === 'PUT') {
      const body = await request.json(); delete body._id; body.updated_at = new Date()
      await db.collection('decoration_kits').updateOne({ id: path[1] }, { $set: body })
      const kit = await db.collection('decoration_kits').findOne({ id: path[1] })
      if (!kit) return err('Kit not found', 404)
      const { _id, ...clean } = kit; return ok(clean)
    }
    if (path[0] === 'kits' && path[1] && !['match','analyze','reference-images'].includes(path[1]) && method === 'DELETE') {
      await db.collection('decoration_kits').deleteOne({ id: path[1] }); return ok({ success: true })
    }
    if (path[0] === 'kits' && path[1] === 'match' && method === 'GET') {
      const url = new URL(request.url)
      const occasion = url.searchParams.get('occasion')
      const query = { is_active: true }; if (occasion) query.occasion_tags = occasion
      let kits = await db.collection('decoration_kits').find(query).toArray()
      if (kits.length === 0) kits = await db.collection('decoration_kits').find({ is_active: true }).toArray()
      return ok(kits.map(({ _id, ...k }) => k))
    }
    if (path[0] === 'kits' && path[1] === 'analyze' && method === 'POST') {
      const { image_base64, name } = await request.json()
      if (!image_base64) return err('image_base64 required')
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const aiRes = await fetch(`${AI_SERVICE_URL}/analyze-decoration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_base64, name: name || '' }), signal: controller.signal })
        clearTimeout(timeout)
        return ok(await aiRes.json())
      } catch (e) { return err('Image analysis failed: ' + e.message, 500) }
    }
    if (path[0] === 'kits' && path[1] === 'reference-images' && path.length === 2 && method === 'POST') {
      const { name, image_base64, tags, occasion, description } = await request.json()
      if (!name || !image_base64) return err('name and image_base64 required')
      const ref = { id: uuidv4(), name, image_base64, tags: tags || [], occasion: occasion || '', description: description || '', created_at: new Date() }
      await db.collection('reference_images').insertOne(ref)
      const { _id, ...clean } = ref; return ok(clean)
    }
    if (path[0] === 'kits' && path[1] === 'reference-images' && path.length === 2 && method === 'GET') {
      const refs = await db.collection('reference_images').find({}).sort({ created_at: -1 }).toArray()
      return ok(refs.map(({ _id, image_base64, ...r }) => ({ ...r, has_image: !!image_base64 })))
    }
    if (path[0] === 'kits' && path[1] === 'reference-images' && path[2] && method === 'DELETE') {
      await db.collection('reference_images').deleteOne({ id: path[2] }); return ok({ success: true })
    }

    // ====== DESIGNS ======
    if (path[0] === 'designs' && path[1] === 'generate' && method === 'POST') {
      const { user_id, room_type, occasion, description, original_image, budget_min, budget_max } = await request.json()
      if (!user_id || !room_type || !occasion) return err('user_id, room_type, occasion required')
      const user = await db.collection('users').findOne({ id: user_id })
      if (!user) return err('User not found', 404)
      if (user.credits <= 0) return err('No credits remaining. Please purchase credits.', 402)
      const bMin = Number(budget_min) || 3000
      const bMax = Number(budget_max) || 5000
      const occasionMap = { birthday: ['birthday','Birthday'], anniversary: ['anniversary','Anniversary'], wedding: ['wedding','Wedding'], baby_shower: ['Ceremony','baby_shower'], engagement: ['Proposal','engagement'], party: ['birthday','Birthday'], housewarming: ['housewarming'], corporate: ['corporate'], dinner: ['anniversary','Anniversary'], festival: ['Holi','festival'] }
      const tagVariants = occasionMap[occasion] || [occasion]
      let selectedKit = null, kitItems = [], kitCost = 0, addOnItems = [], addOnCost = 0, kitUsed = false
      let matchingKits = await db.collection('decoration_kits').find({ $and: [{ active: true }, { selling_total: { $lte: bMax } }, { $or: tagVariants.map(t => ({ occasion_tags: { $regex: t, $options: 'i' } })) }] }).toArray()
      if (matchingKits.length === 0) matchingKits = await db.collection('decoration_kits').find({ active: true, selling_total: { $lte: bMax } }).toArray()
      if (matchingKits.length > 0) {
        selectedKit = matchingKits.sort((a, b) => b.selling_total - a.selling_total)[0]
        const bom = selectedKit.bom || selectedKit.kit_items || []
        kitItems = bom.map(bi => ({ id: uuidv4(), name: bi.item || bi.name || 'Item', description: `${bi.item || bi.name} - ${bi.uom || 'pc'}`, price: Number(bi.unit_purchase || bi.unit_price || 0), quantity: Number(bi.qty || bi.quantity || 1), category: 'kit_item', color: '', size: bi.uom || '', image_url: '', is_kit_item: true }))
        kitCost = selectedKit.selling_total || selectedKit.final_price || 0
        kitUsed = true
        const looseItems = await db.collection('items').find({ stock_count: { $gt: 0 } }).toArray()
        const budgetForAddons = Math.max(0, bMax - kitCost)
        let addonSpent = 0
        const orderedItems = looseItems.sort(() => Math.random() - 0.5)
        for (const item of orderedItems) {
          if (addonSpent >= budgetForAddons) break
          const price = item.selling_price_unit || item.price || 0
          if (price > 0 && addonSpent + price <= budgetForAddons) {
            addOnItems.push({ id: item.id, name: item.name, description: item.type_finish || item.category || '', price, quantity: 1, category: item.category || '', color: item.type_finish || '', size: item.size || '', image_url: item.image_url || '', is_kit_item: false })
            addonSpent += price
          }
        }
        addOnCost = addonSpent
      } else {
        const allItems = await db.collection('items').find({ stock_count: { $gt: 0 } }).toArray()
        if (allItems.length === 0) return err('No decoration items. Run /api/seed first.', 500)
        let spent = 0
        for (const item of allItems.sort(() => Math.random() - 0.5)) {
          if (spent >= bMax) break
          const price = item.selling_price_unit || item.price || 0
          if (price > 0 && spent + price <= bMax) { addOnItems.push({ id: item.id, name: item.name, description: item.type_finish || item.category || '', price, quantity: 1, category: item.category || '', color: item.type_finish || '', size: item.size || '', image_url: item.image_url || '', is_kit_item: false }); spent += price }
        }
        addOnCost = spent
      }
      const allSelectedItems = [...kitItems, ...addOnItems]
      const totalCost = kitCost + addOnCost
      const itemDescriptions = allSelectedItems.slice(0, 15).map(i => `${i.quantity}x ${i.name}`).join(', ')
      const ikFolder = getImageKitFolder(bMin, bMax)
      let prompt, hasUserImage = false
      if (original_image && original_image.includes('base64')) {
        hasUserImage = true
        prompt = `Add beautiful ${occasion} decorations to this exact room. Keep all existing furniture and walls EXACTLY as they are. Only add these decoration items: ${itemDescriptions}. Budget: Rs${bMin}-Rs${bMax}. Style: FatafatDecor ${ikFolder}. ${description || ''} Photorealistic, professional event decoration.`
      } else {
        prompt = `Create a photorealistic beautifully decorated ${room_type} for ${occasion}. Budget: Rs${bMin}-Rs${bMax}. Include: ${itemDescriptions}. Style: FatafatDecor ${ikFolder} aesthetic. ${description || ''} Professional photography, 4k, warm lighting.`
      }
      let image_base64 = null
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 120000)
        const aiBody = { prompt }; if (hasUserImage) aiBody.image_base64 = original_image
        const aiRes = await fetch(`${AI_SERVICE_URL}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aiBody), signal: controller.signal })
        clearTimeout(timeout)
        const aiData = await aiRes.json()
        if (aiData.success) image_base64 = aiData.image_base64
        else throw new Error(aiData.detail || 'AI generation failed')
      } catch (aiErr) { return err('AI image generation failed. Please try again.', 500) }
      await db.collection('users').updateOne({ id: user_id }, { $inc: { credits: -1 } })
      const design = { id: uuidv4(), user_id, room_type, occasion, description: description || '', original_image: hasUserImage ? '[uploaded]' : null, decorated_image: image_base64, kit_id: selectedKit?.id || null, kit_name: selectedKit?.name || null, kit_items: kitItems, kit_cost: kitCost, addon_items: addOnItems, addon_cost: addOnCost, items_used: allSelectedItems, total_cost: totalCost, status: 'generated', created_at: new Date() }
      await db.collection('designs').insertOne(design)
      const { _id, ...cleanDesign } = design
      return ok({ ...cleanDesign, remaining_credits: user.credits - 1, kit_used: kitUsed })
    }
    if (path[0] === 'designs' && !path[1] && method === 'GET') {
      const url = new URL(request.url)
      const user_id = url.searchParams.get('user_id')
      if (!user_id) return err('user_id required')
      const designs = await db.collection('designs').find({ user_id }).sort({ created_at: -1 }).toArray()
      return ok(designs.map(({ _id, ...d }) => d))
    }
    if (path[0] === 'designs' && path[1] && path[1] !== 'generate' && method === 'GET') {
      const design = await db.collection('designs').findOne({ id: path[1] })
      if (!design) return err('Design not found', 404)
      const { _id, ...clean } = design; return ok(clean)
    }

    // ====== ORDERS ======
    if (path[0] === 'orders' && !path[1] && method === 'POST') {
      const { user_id, design_id, delivery_address, delivery_lat, delivery_lng } = await request.json()
      if (!user_id || !design_id) return err('user_id, design_id required')
      const design = await db.collection('designs').findOne({ id: design_id })
      if (!design) return err('Design not found', 404)
      const order = { id: uuidv4(), user_id, design_id, items: design.items_used, total_cost: design.total_cost, payment_status: 'pending', payment_amount: 0, delivery_person_id: null, delivery_slot: null, delivery_status: 'pending', delivery_address: delivery_address || '', delivery_location: { lat: delivery_lat || null, lng: delivery_lng || null }, created_at: new Date() }
      await db.collection('orders').insertOne(order)
      await db.collection('designs').updateOne({ id: design_id }, { $set: { status: 'ordered' } })
      const { _id, ...clean } = order; return ok(clean)
    }
    if (path[0] === 'orders' && !path[1] && method === 'GET') {
      const url = new URL(request.url)
      const user_id = url.searchParams.get('user_id')
      if (!user_id) return err('user_id required')
      const orders = await db.collection('orders').find({ user_id }).sort({ created_at: -1 }).toArray()
      return ok(orders.map(({ _id, ...o }) => o))
    }
    if (path[0] === 'orders' && path[1] && method === 'GET') {
      const order = await db.collection('orders').findOne({ id: path[1] })
      if (!order) return err('Order not found', 404)
      const { _id, ...clean } = order; return ok(clean)
    }

    // ====== PAYMENTS ======
    if (path[0] === 'payments' && path[1] === 'create-order' && method === 'POST') {
      const { type, amount, user_id, order_id, credits_count } = await request.json()
      if (!type || !amount || !user_id) return err('type, amount, user_id required')
      try {
        const Razorpay = (await import('razorpay')).default
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
        const rzpOrder = await rzp.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: `${type}_${uuidv4().slice(0, 8)}` })
        const payment = { id: uuidv4(), type, user_id, order_id: order_id || null, credits_count: credits_count || 0, amount, razorpay_order_id: rzpOrder.id, status: 'created', created_at: new Date() }
        await db.collection('payments').insertOne(payment)
        return ok({ razorpay_order_id: rzpOrder.id, amount: rzpOrder.amount, currency: 'INR', payment_id: payment.id })
      } catch (e) { return err('Payment creation failed: ' + e.message, 500) }
    }
    if (path[0] === 'payments' && path[1] === 'verify' && method === 'POST') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()
      const generatedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex')
      if (generatedSig !== razorpay_signature) return err('Payment verification failed', 400)
      const payment = await db.collection('payments').findOne({ razorpay_order_id })
      if (!payment) return err('Payment not found', 404)
      await db.collection('payments').updateOne({ razorpay_order_id }, { $set: { status: 'verified', razorpay_payment_id, razorpay_signature } })
      if (payment.type === 'credits') await db.collection('users').updateOne({ id: payment.user_id }, { $inc: { credits: payment.credits_count }, $set: { has_purchased_credits: true } })
      if (payment.type === 'delivery' && payment.order_id) await db.collection('orders').updateOne({ id: payment.order_id }, { $set: { payment_status: 'partial', payment_amount: payment.amount } })
      return ok({ success: true, type: payment.type })
    }

    // ====== DELIVERY SLOTS ======
    if (path[0] === 'delivery' && path[1] === 'slots' && method === 'GET') {
      const url = new URL(request.url)
      const date = url.searchParams.get('date')
      if (!date) return err('date required (YYYY-MM-DD)')
      const deliveryPersons = await db.collection('delivery_persons').find({ is_active: true }).toArray()
      const slots = []
      for (let hour = 9; hour <= 20; hour++) {
        const bookedCount = deliveryPersons.filter(dp => (dp.schedule?.[date] || []).includes(hour)).length
        const available = deliveryPersons.length - bookedCount
        slots.push({ hour, time_label: `${hour}:00 - ${hour + 1}:00`, available: available > 0, available_count: available })
      }
      return ok({ date, slots })
    }
    if (path[0] === 'delivery' && path[1] === 'book' && method === 'POST') {
      const { order_id, date, hour } = await request.json()
      if (!order_id || !date || hour === undefined) return err('order_id, date, hour required')
      const order = await db.collection('orders').findOne({ id: order_id })
      if (!order) return err('Order not found', 404)
      const deliveryPersons = await db.collection('delivery_persons').find({ is_active: true }).toArray()
      let assignedPerson = deliveryPersons.find(dp => !(dp.schedule?.[date] || []).includes(hour))
      if (!assignedPerson) return err('No delivery person available for this slot.', 409)
      await db.collection('delivery_persons').updateOne({ id: assignedPerson.id }, { $push: { [`schedule.${date}`]: hour } })
      await db.collection('orders').updateOne({ id: order_id }, { $set: { delivery_person_id: assignedPerson.id, delivery_slot: { date, hour }, delivery_status: 'assigned' } })
      return ok({ success: true, delivery_person: { id: assignedPerson.id, name: assignedPerson.name, phone: assignedPerson.phone }, slot: { date, hour, time_label: `${hour}:00 - ${hour + 1}:00` } })
    }
    if (path[0] === 'delivery' && path[1] === 'update-location' && method === 'POST') {
      const { delivery_person_id, lat, lng } = await request.json()
      await db.collection('delivery_persons').updateOne({ id: delivery_person_id }, { $set: { current_location: { lat, lng, updated_at: new Date() } } })
      return ok({ success: true })
    }
    if (path[0] === 'delivery' && path[1] === 'track' && path[2] && method === 'GET') {
      const order = await db.collection('orders').findOne({ id: path[2] })
      if (!order) return err('Order not found', 404)
      if (!order.delivery_person_id) return ok({ order_id: order.id, delivery_status: order.delivery_status || 'pending', delivery_slot: order.delivery_slot || null, delivery_person: null, delivery_location: null, user_location: order.delivery_location || null, message: 'Delivery person not yet assigned' })
      const dp = await db.collection('delivery_persons').findOne({ id: order.delivery_person_id })
      if (!dp) return ok({ order_id: order.id, delivery_status: order.delivery_status, delivery_slot: order.delivery_slot, delivery_person: null, delivery_location: null, user_location: order.delivery_location || null })
      return ok({ order_id: order.id, delivery_status: order.delivery_status, delivery_slot: order.delivery_slot, delivery_person: { name: dp.name, phone: dp.phone }, delivery_location: dp.current_location || null, user_location: order.delivery_location || null, verification_otp: order.verification_otp || null, otp_verified: order.otp_verified || false })
    }
    if (path[0] === 'delivery' && path[1] === 'status' && method === 'POST') {
      const { order_id, status, dp_id } = await request.json()
      if (!order_id || !status || !dp_id) return err('order_id, status, dp_id required')
      const VALID_STATUSES = ['pending', 'assigned', 'en_route', 'arrived', 'decorating', 'delivered', 'cancelled']
      if (!VALID_STATUSES.includes(status)) return err('Invalid status', 400)
      const dsOrder = await db.collection('orders').findOne({ id: order_id })
      if (!dsOrder) return err('Order not found', 404)
      const dsAssigned = (dsOrder.accepted_decorators || []).includes(dp_id) || dsOrder.delivery_person_id === dp_id
      if (!dsAssigned) return err('Not authorized to update this order', 403)
      await db.collection('orders').updateOne({ id: order_id }, { $set: { delivery_status: status } })
      return ok({ success: true })
    }

    // ====== CREDITS ======
    if (path[0] === 'credits' && path[1] && method === 'GET') {
      const user = await db.collection('users').findOne({ id: path[1] })
      if (!user) return err('User not found', 404)
      return ok({ user_id: user.id, credits: user.credits })
    }

    // ====== DELIVERY PERSONS ======
    if (path[0] === 'delivery-persons' && !path[1] && method === 'GET') {
      const dps = await db.collection('delivery_persons').find({}).toArray()
      return ok(dps.map(({ _id, ...dp }) => dp))
    }
    if (path[0] === 'delivery-persons' && !path[1] && method === 'POST') {
      const body = await request.json()
      const dp = { id: uuidv4(), name: body.name, phone: body.phone || '', password: hashPwd(body.password || '1234'), is_active: true, current_location: null, schedule: {}, rating: 5.0, total_deliveries: 0, created_at: new Date() }
      await db.collection('delivery_persons').insertOne(dp)
      const { _id, password: _, ...clean } = dp; return ok(clean)
    }
    if (path[0] === 'delivery-persons' && path[1] && method === 'PUT') {
      const body = await request.json(); delete body._id
      await db.collection('delivery_persons').updateOne({ id: path[1] }, { $set: body })
      const dp = await db.collection('delivery_persons').findOne({ id: path[1] })
      if (!dp) return err('Delivery person not found', 404)
      const { _id, ...clean } = dp; return ok(clean)
    }

    // ====== USER LOCATION ======
    if (path[0] === 'user' && path[1] === 'location' && method === 'POST') {
      const { user_id, lat, lng } = await request.json()
      if (!user_id) return err('user_id required')
      await db.collection('users').updateOne({ id: user_id }, { $set: { location: { lat, lng, updated_at: new Date() } } })
      return ok({ success: true })
    }

    // ====== IMAGEKIT ======
    if (path[0] === 'imagekit' && path[1] === 'reference' && method === 'GET') {
      const url = new URL(request.url)
      const budget_min = Number(url.searchParams.get('budget_min') || 3000)
      const budget_max = Number(url.searchParams.get('budget_max') || 5000)
      const folder = getImageKitFolder(budget_min, budget_max)
      return ok({ folder, base_url: IMAGEKIT_URL, folder_url: `${IMAGEKIT_URL}/${folder}`, budget_min, budget_max })
    }
    if (path[0] === 'imagekit' && path[1] === 'upload' && method === 'POST') {
      const { file_base64, file_name, folder } = await request.json()
      if (!file_base64 || !file_name) return err('file_base64 and file_name required')
      const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
      if (!privateKey) return err('IMAGEKIT_PRIVATE_KEY not configured', 500)
      try {
        const auth = Buffer.from(privateKey + ':').toString('base64')
        const body = new URLSearchParams()
        body.append('file', file_base64); body.append('fileName', file_name); body.append('folder', folder || '/uploads')
        const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        const ikData = await ikRes.json()
        if (ikData.url) return ok({ success: true, url: ikData.url, fileId: ikData.fileId })
        return err('ImageKit upload failed: ' + JSON.stringify(ikData), 500)
      } catch (e) { return err('ImageKit upload error: ' + e.message, 500) }
    }

    // ====== DECORATOR APP ======
    if (path[0] === 'dp' && path[1] === 'login' && method === 'POST') {
      const { phone, password } = await request.json()
      if (!phone) return err('Phone required')
      const dp = await db.collection('delivery_persons').findOne({ phone })
      if (!dp) return err('Delivery person not found', 404)
      if (dp.password && password && dp.password !== hashPwd(password)) return err('Invalid password', 401)
      const { _id, password: _, ...safe } = dp; return ok(safe)
    }
    if (path[0] === 'dp' && path[1] === 'dashboard' && path[2] && method === 'GET') {
      const dpId = path[2]; const today = new Date().toISOString().split('T')[0]
      const dp = await db.collection('delivery_persons').findOne({ id: dpId })
      if (!dp) return err('Delivery person not found', 404)
      // Today's orders: this decorator is one of the 2 accepted decorators
      const todayOrders = await db.collection('orders').find({
        $or: [{ accepted_decorators: dpId }, { delivery_person_id: dpId }],
        'delivery_slot.date': today
      }).sort({ 'delivery_slot.hour': 1 }).toArray()
      // Active jobs: accepted and currently in progress
      const allActiveOrders = await db.collection('orders').find({
        $or: [{ accepted_decorators: dpId }, { delivery_person_id: dpId }],
        delivery_status: { $in: ['assigned', 'en_route', 'arrived', 'decorating'] }
      }).toArray()
      // Pending requests: this decorator is in assigned_decorators but has NOT yet accepted (not in accepted_decorators)
      // and fewer than 2 decorators have accepted
      const pendingOrders = await db.collection('orders').find({
        assigned_decorators: dpId,
        accepted_decorators: { $not: { $elemMatch: { $eq: dpId } } },
        $expr: { $lt: [{ $size: { $ifNull: ['$accepted_decorators', []] } }, 2] }
      }).sort({ created_at: -1 }).toArray()
      const { _id, password: _, ...safeDp } = dp
      return ok({ delivery_person: safeDp, today_orders: todayOrders.map(({ _id, ...o }) => o), active_orders: allActiveOrders.map(({ _id, ...o }) => o), pending_orders: pendingOrders.map(({ _id, ...o }) => o), date: today })
    }
    if (path[0] === 'dp' && path[1] === 'calendar' && path[2] && method === 'GET') {
      const dpId = path[2]; const url = new URL(request.url); const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
      const dp = await db.collection('delivery_persons').findOne({ id: dpId })
      if (!dp) return err('Delivery person not found', 404)
      const orders = await db.collection('orders').find({
        $or: [{ accepted_decorators: dpId }, { delivery_person_id: dpId }],
        'delivery_slot.date': { $regex: `^${month}` }
      }).sort({ 'delivery_slot.date': 1, 'delivery_slot.hour': 1 }).toArray()
      return ok({ month, schedule: dp.schedule || {}, orders: orders.map(({ _id, ...o }) => o) })
    }
    if (path[0] === 'dp' && path[1] === 'orders' && path[2] && method === 'GET') {
      const dpId = path[2]; const url = new URL(request.url); const status = url.searchParams.get('status')
      const query = { $or: [{ accepted_decorators: dpId }, { delivery_person_id: dpId }] }
      if (status) query.delivery_status = status
      const orders = await db.collection('orders').find(query).sort({ created_at: -1 }).toArray()
      return ok(orders.map(({ _id, ...o }) => o))
    }
    if (path[0] === 'dp' && path[1] === 'generate-otp' && method === 'POST') {
      const { order_id } = await request.json()
      if (!order_id) return err('order_id required')
      const otp = String(Math.floor(1000 + Math.random() * 9000))
      await db.collection('orders').updateOne({ id: order_id }, { $set: { verification_otp: otp, otp_generated_at: new Date() } })
      return ok({ otp, order_id })
    }
    if (path[0] === 'dp' && path[1] === 'face-scan' && method === 'POST') {
      const { order_id, dp_id, face_image } = await request.json()
      if (!order_id || !dp_id || !face_image) return err('order_id, dp_id, face_image required')
      const dp = await db.collection('delivery_persons').findOne({ id: dp_id })
      if (!dp) return err('Delivery person not found', 404)
      const fsOrder = await db.collection('orders').findOne({ id: order_id })
      if (!fsOrder) return err('Order not found', 404)
      const fsAssigned = (fsOrder.accepted_decorators || []).includes(dp_id) || fsOrder.delivery_person_id === dp_id
      if (!fsAssigned) return err('Not authorized for this order', 403)
      await db.collection('orders').updateOne({ id: order_id }, { $set: { face_scan: { dp_id, dp_name: dp.name, image: face_image, scanned_at: new Date() }, delivery_status: 'arrived' } })
      return ok({ success: true, dp_name: dp.name })
    }
    if (path[0] === 'dp' && path[1] === 'verify-otp' && method === 'POST') {
      const { order_id, otp, dp_id } = await request.json()
      if (!order_id || !otp) return err('order_id, otp required')
      const order = await db.collection('orders').findOne({ id: order_id })
      if (!order) return err('Order not found', 404)
      if (dp_id) {
        const votAssigned = (order.accepted_decorators || []).includes(dp_id) || order.delivery_person_id === dp_id
        if (!votAssigned) return err('Not authorized for this order', 403)
      }
      if (!order.verification_otp) return err('OTP not yet generated', 400)
      const expectedOtp = Buffer.from(String(order.verification_otp))
      const actualOtp = Buffer.from(String(otp))
      if (expectedOtp.length !== actualOtp.length || !crypto.timingSafeEqual(expectedOtp, actualOtp)) return err('Invalid OTP', 401)
      const startTime = new Date()
      await db.collection('orders').updateOne({ id: order_id }, { $set: { delivery_status: 'decorating', decoration_started_at: startTime, otp_verified: true } })
      return ok({ success: true, started_at: startTime })
    }
    if (path[0] === 'dp' && path[1] === 'complete' && method === 'POST') {
      const { order_id, dp_id } = await request.json()
      if (!order_id) return err('order_id required')
      if (dp_id) {
        const compOrder = await db.collection('orders').findOne({ id: order_id })
        if (!compOrder) return err('Order not found', 404)
        const compAssigned = (compOrder.accepted_decorators || []).includes(dp_id) || compOrder.delivery_person_id === dp_id
        if (!compAssigned) return err('Not authorized for this order', 403)
      }
      const completedAt = new Date()
      await db.collection('orders').updateOne({ id: order_id }, { $set: { delivery_status: 'delivered', decoration_completed_at: completedAt } })
      if (dp_id) {
        await db.collection('delivery_persons').updateOne({ id: dp_id }, { $inc: { total_deliveries: 1 } })
      }
      return ok({ success: true, completed_at: completedAt })
    }
    if (path[0] === 'dp' && path[1] === 'collect-payment' && method === 'POST') {
      const { order_id, dp_id, amount, method: payMethod, notes } = await request.json()
      if (!order_id || !dp_id || !amount) return err('order_id, dp_id, amount required')
      const cpOrder = await db.collection('orders').findOne({ id: order_id })
      if (!cpOrder) return err('Order not found', 404)
      const cpAssigned = (cpOrder.accepted_decorators || []).includes(dp_id) || cpOrder.delivery_person_id === dp_id
      if (!cpAssigned) return err('Not authorized for this order', 403)
      const collection = { id: uuidv4(), order_id, dp_id, amount: Number(amount), method: payMethod || 'cash', notes: notes || '', deposited: false, created_at: new Date() }
      await db.collection('dp_collections').insertOne(collection)
      await db.collection('orders').updateOne({ id: order_id }, { $set: { payment_status: 'full', remaining_collected: true, collection_method: payMethod || 'cash' } })
      const { _id, ...clean } = collection; return ok(clean)
    }
    if (path[0] === 'dp' && path[1] === 'deposit-cash' && method === 'POST') {
      const { dp_id, amount, deposit_method, reference_number } = await request.json()
      if (!dp_id || !amount) return err('dp_id, amount required')
      const deposit = { id: uuidv4(), dp_id, amount: Number(amount), deposit_method: deposit_method || 'office_cash', reference_number: reference_number || '', created_at: new Date() }
      await db.collection('dp_deposits').insertOne(deposit)
      await db.collection('dp_collections').updateMany({ dp_id, deposited: false, method: 'cash' }, { $set: { deposited: true, deposit_id: deposit.id } })
      const { _id, ...clean } = deposit; return ok(clean)
    }
    if (path[0] === 'dp' && path[1] === 'earnings' && path[2] && method === 'GET') {
      const dpId = path[2]
      const collections = await db.collection('dp_collections').find({ dp_id: dpId }).sort({ created_at: -1 }).toArray()
      const deposits = await db.collection('dp_deposits').find({ dp_id: dpId }).sort({ created_at: -1 }).toArray()
      const totalCollected = collections.reduce((s, c) => s + c.amount, 0)
      const cashCollected = collections.filter(c => c.method === 'cash').reduce((s, c) => s + c.amount, 0)
      const cashDeposited = deposits.reduce((s, d) => s + d.amount, 0)
      return ok({ total_collected: totalCollected, cash_collected: cashCollected, cash_deposited: cashDeposited, cash_pending: cashCollected - cashDeposited, recent_collections: collections.slice(0, 20).map(({ _id, ...c }) => c), recent_deposits: deposits.slice(0, 10).map(({ _id, ...d }) => d) })
    }
    if (path[0] === 'dp' && path[1] === 'update-status' && method === 'POST') {
      const { order_id, status, notes, dp_id } = await request.json()
      if (!order_id || !status) return err('order_id, status required')
      const VALID_DP_STATUSES = ['en_route', 'arrived', 'decorating', 'delivered']
      if (!VALID_DP_STATUSES.includes(status)) return err('Invalid status', 400)
      if (dp_id) {
        const usOrder = await db.collection('orders').findOne({ id: order_id })
        if (!usOrder) return err('Order not found', 404)
        const usAssigned = (usOrder.accepted_decorators || []).includes(dp_id) || usOrder.delivery_person_id === dp_id
        if (!usAssigned) return err('Not authorized for this order', 403)
      }
      const update = { delivery_status: status }
      if (status === 'en_route') update.en_route_at = new Date()
      if (status === 'arrived') update.arrived_at = new Date()
      if (notes) update.dp_notes = notes
      await db.collection('orders').updateOne({ id: order_id }, { $set: update })
      return ok({ success: true })
    }
    if (path[0] === 'dp' && path[1] === 'accept-order' && method === 'POST') {
      const { order_id, dp_id } = await request.json()
      if (!order_id || !dp_id) return err('order_id, dp_id required')
      const order = await db.collection('orders').findOne({ id: order_id })
      if (!order) return err('Order not found', 404)
      const accepted = order.accepted_decorators || []
      // Already accepted by this decorator
      if (accepted.includes(dp_id)) return err('You have already accepted this order', 409)
      // Both slots filled — 2 decorators already accepted
      if (accepted.length >= 2) return err('This order already has 2 decorators assigned', 409)
      const dp = await db.collection('delivery_persons').findOne({ id: dp_id })
      if (!dp) return err('Decorator not found', 404)
      const isSecond = accepted.length === 1
      const updateFields = { accepted_at: new Date() }
      // First acceptor becomes the lead decorator for location tracking
      if (accepted.length === 0) updateFields.delivery_person_id = dp_id
      // When 2nd decorator accepts → order is fully assigned
      if (isSecond) updateFields.delivery_status = 'assigned'
      await db.collection('orders').updateOne(
        { id: order_id },
        { $push: { accepted_decorators: dp_id }, $set: updateFields }
      )
      const msg = isSecond
        ? 'Order accepted! Both decorators assigned. Job is confirmed.'
        : 'Order accepted! Waiting for a second decorator to join.'
      return ok({ success: true, message: msg, is_second: isSecond })
    }
    if (path[0] === 'dp' && path[1] === 'decline-order' && method === 'POST') {
      const { order_id, dp_id } = await request.json()
      if (!order_id || !dp_id) return err('order_id, dp_id required')
      // Remove from both assigned and accepted arrays
      await db.collection('orders').updateOne({ id: order_id }, {
        $pull: { assigned_decorators: dp_id, accepted_decorators: dp_id }
      })
      // If no decorators remain at all, set back to pending
      const updated = await db.collection('orders').findOne({ id: order_id })
      if (!updated?.delivery_person_id && (!updated?.assigned_decorators || updated.assigned_decorators.length === 0)) {
        await db.collection('orders').updateOne({ id: order_id }, { $set: { delivery_status: 'pending' } })
      }
      return ok({ success: true, message: 'Order declined' })
    }
    if (path[0] === 'dp' && path[1] === 'order-detail' && path[2] && method === 'GET') {
      const order = await db.collection('orders').findOne({ id: path[2] })
      if (!order) return err('Order not found', 404)
      const user = await db.collection('users').findOne({ id: order.user_id })
      const design = order.design_id ? await db.collection('designs').findOne({ id: order.design_id }) : null
      let kitInfo = null
      if (design?.kit_id) {
        const kit = await db.collection('decoration_kits').findOne({ id: design.kit_id })
        if (kit) { const { _id, reference_images, ...kitData } = kit; kitInfo = kitData }
      }
      const { _id: _1, password: _2, ...safeUser } = user || {}
      const { _id: _3, ...cleanOrder } = order
      return ok({ ...cleanOrder, customer: safeUser, decorated_image: design?.decorated_image || null, kit_name: design?.kit_name || null, kit_id: design?.kit_id || null, kit_info: kitInfo, kit_items: design?.kit_items || [], addon_items: design?.addon_items || [] })
    }

    // ====== SEED ======
    if (path[0] === 'seed' && (method === 'POST' || method === 'GET')) {
      await db.collection('items').deleteMany({})
      // NOTE: delivery_persons are NOT deleted — their IDs are referenced by orders
      await db.collection('rent_items').deleteMany({})
      await db.collection('decoration_kits').deleteMany({})
      const citiesExist = await db.collection('allowed_cities').countDocuments({})
      if (citiesExist === 0) {
        await db.collection('allowed_cities').insertMany([
          { id: uuidv4(), name: 'Ranchi', state: 'Jharkhand', active: true, created_at: new Date() },
          { id: uuidv4(), name: 'Pune', state: 'Maharashtra', active: true, created_at: new Date() }
        ])
      }
      const IK = IMAGEKIT_URL
      const items = [
        { name: 'Mix Balloon Set', category: 'Balloons', type_finish: 'Mix', size: '10-12 inch', unit_cost: 16, selling_price_unit: 20.8, stock_count: 500, tags: ['birthday','party','celebration','universal'], image_url: IK+'/dataset/3-5k/balloons_mix.jpg' },
        { name: 'Transparent Confetti Balloon', category: 'Balloons', type_finish: 'Transparent', size: '10-12 inch', unit_cost: 25, selling_price_unit: 32.5, stock_count: 200, tags: ['birthday','party','celebration','universal'], image_url: IK+'/dataset/3-5k/balloons_confetti.jpg' },
        { name: 'Pink Balloon', category: 'Balloons', type_finish: 'Coloured', size: '10-12 inch', unit_cost: 8, selling_price_unit: 10.4, stock_count: 500, tags: ['birthday','baby_shower','party','universal'], image_url: IK+'/dataset/3-5k/balloons_pink.jpg' },
        { name: 'Red Balloon', category: 'Balloons', type_finish: 'Coloured', size: '10-12 inch', unit_cost: 9, selling_price_unit: 11.7, stock_count: 500, tags: ['anniversary','party','universal','romantic'], image_url: IK+'/dataset/3-5k/balloons_red.jpg' },
        { name: 'Golden Chrome Balloon', category: 'Balloons', type_finish: 'Chrome', size: '12 inch', unit_cost: 12, selling_price_unit: 15.6, stock_count: 250, tags: ['birthday','anniversary','wedding','celebration'], image_url: IK+'/dataset/3-5k/balloons_chrome_gold.jpg' },
        { name: 'Rose Gold Balloon', category: 'Balloons', type_finish: 'Chrome', size: '12 inch', unit_cost: 12, selling_price_unit: 15.6, stock_count: 250, tags: ['birthday','engagement','anniversary','celebration'], image_url: IK+'/dataset/3-5k/balloons_rose_gold.jpg' },
        { name: 'Pastel Balloon Small', category: 'Balloons', type_finish: 'Pastel', size: '10-12 inch', unit_cost: 14, selling_price_unit: 18.2, stock_count: 500, tags: ['birthday','baby_shower','party','universal'], image_url: IK+'/dataset/3-5k/balloons_pastel.jpg' },
        { name: 'Red Heart Balloon', category: 'Balloons', type_finish: 'Foil Shape', size: '12 inch', unit_cost: 60, selling_price_unit: 78, stock_count: 100, tags: ['anniversary','romantic','engagement','valentine'], image_url: IK+'/dataset/3-5k/balloons_heart_red.jpg' },
        { name: 'Transparent Balloon Large', category: 'Balloons', type_finish: 'Transparent', size: '20 inch', unit_cost: 60, selling_price_unit: 78, stock_count: 100, tags: ['birthday','party','universal'], image_url: IK+'/dataset/3-5k/balloons_transparent_large.jpg' },
        { name: 'Foil Backdrop Curtain', category: 'Backdrop', type_finish: 'Foil', size: '6ft x 4ft', unit_cost: 350, selling_price_unit: 455, stock_count: 20, tags: ['birthday','anniversary','party','celebration','universal'], image_url: IK+'/dataset/3-5k/backdrop_foil.jpg' },
        { name: 'Net Backdrop Large', category: 'Backdrop', type_finish: 'Net', size: '5m x 1.5m', unit_cost: 500, selling_price_unit: 650, stock_count: 20, tags: ['birthday','anniversary','wedding','party','universal'], image_url: IK+'/dataset/3-5k/backdrop_net.jpg' },
        { name: 'LED Curtain String', category: 'Lighting', type_finish: 'LED Curtain', size: 'Standard', unit_cost: 755, selling_price_unit: 981.5, stock_count: 15, tags: ['anniversary','romantic','wedding','dinner','universal'], image_url: IK+'/dataset/3-5k/lights_curtain.jpg' },
        { name: 'Artificial Flower Set', category: 'Floral', type_finish: 'Artificial', size: 'Standard', unit_cost: 1200, selling_price_unit: 1560, stock_count: 10, tags: ['wedding','anniversary','romantic','celebration'], image_url: IK+'/dataset/5-10k/flower_wall.jpg' },
        { name: 'Neon Sign - Happy Birthday', category: 'Neon Signs', type_finish: 'Neon', size: 'N/A', unit_cost: 2000, selling_price_unit: 2600, stock_count: 5, tags: ['birthday','celebration','party'], image_url: IK+'/dataset/5-10k/neon_custom.jpg' },
        { name: "Neon Sign - Let's Party (Pink)", category: 'Neon Signs', type_finish: 'Neon', size: 'Medium', unit_cost: 2000, selling_price_unit: 2600, stock_count: 5, tags: ['birthday','party','celebration'], image_url: IK+'/dataset/5-10k/neon_dance.jpg' },
        { name: 'Neon Sign - Good Vibes Only', category: 'Neon Signs', type_finish: 'Neon', size: 'N/A', unit_cost: 2300, selling_price_unit: 2990, stock_count: 5, tags: ['party','celebration','birthday'], image_url: IK+'/dataset/5-10k/neon_sign.jpg' },
        { name: 'Neon Sign - Bride To Be', category: 'Neon Signs', type_finish: 'Neon', size: 'N/A', unit_cost: 2000, selling_price_unit: 2600, stock_count: 5, tags: ['wedding','engagement','bride_shower'], image_url: IK+'/dataset/5-10k/neon_custom.jpg' },
        { name: 'Foil Number Balloon', category: 'Foil Balloons', type_finish: 'Foil', size: '16 inch', unit_cost: 150, selling_price_unit: 195, stock_count: 100, tags: ['birthday','anniversary','celebration'], image_url: IK+'/dataset/5-10k/marquee_letters.jpg' },
        { name: 'Foil Letter Balloon', category: 'Foil Balloons', type_finish: 'Foil', size: '32 inch', unit_cost: 200, selling_price_unit: 260, stock_count: 100, tags: ['birthday','anniversary','celebration'], image_url: IK+'/dataset/5-10k/marquee_letters.jpg' },
        { name: 'LED Pillar Candle Set (3 pcs)', category: 'Lighting', type_finish: 'LED', size: 'Set of 3', unit_cost: 400, selling_price_unit: 520, stock_count: 10, tags: ['anniversary','romantic','dinner','wedding'], image_url: IK+'/dataset/5-10k/centerpiece.jpg' },
        { name: 'Colour Net Curtain', category: 'Backdrop', type_finish: 'Net', size: '8ft x 4ft', unit_cost: 400, selling_price_unit: 520, stock_count: 20, tags: ['haldi','festival','wedding','celebration'], image_url: IK+'/dataset/3-5k/backdrop_net.jpg' },
        { name: 'Glue Dot Roll (Balloon)', category: 'Tools & Supplies', type_finish: 'Adhesive', size: 'Roll', unit_cost: 250, selling_price_unit: 325, stock_count: 50, tags: ['universal'], image_url: '' },
        { name: 'Ribbon Roll', category: 'Tools & Supplies', type_finish: 'Ribbon', size: 'Standard', unit_cost: 100, selling_price_unit: 130, stock_count: 50, tags: ['universal'], image_url: '' },
        { name: 'Tape Roll', category: 'Tools & Supplies', type_finish: 'Tape', size: 'Standard', unit_cost: 50, selling_price_unit: 65, stock_count: 100, tags: ['universal'], image_url: '' },
        { name: 'Fishing String Roll', category: 'Tools & Supplies', type_finish: 'Thread/String', size: 'Small roll', unit_cost: 400, selling_price_unit: 520, stock_count: 50, tags: ['universal'], image_url: '' },
        { name: 'Zip Tie Packet', category: 'Tools & Supplies', type_finish: 'Fasteners', size: 'N/A', unit_cost: 500, selling_price_unit: 650, stock_count: 50, tags: ['universal'], image_url: '' },
      ].map(i => ({ ...i, id: uuidv4(), price: i.selling_price_unit, active: true, created_at: new Date() }))
      await db.collection('items').insertMany(items)

      const rentItems = [
        { item_id: 'HV-0001', name: 'Happy Birthday Neon Sign LED 12x18 Inch', category: 'Lighting', rental_cost: 500, selling_price: 2600, is_sellable: true, image_url: IK+'/rentals/neon_hb.jpg' },
        { item_id: 'HV-0002', name: "Let's Party LED Neon (15x10x1 cm)", category: 'Lighting', rental_cost: 275, selling_price: 1430, is_sellable: true, image_url: IK+'/rentals/neon_lp.jpg' },
        { item_id: 'HV-0007', name: 'Alphabet LED Marquee Letter (Warm White)', category: 'Lighting', rental_cost: 75, selling_price: 390, is_sellable: true, image_url: IK+'/rentals/marquee_letter.jpg' },
        { item_id: 'HV-0011', name: 'Background Support Kit Metal Stand 9ft x 9ft', category: 'Stands', rental_cost: 625, selling_price: null, is_sellable: false, image_url: IK+'/rentals/stand_metal.jpg' },
        { item_id: 'HV-0013', name: 'Rectangle Balloon Stand (PVC) 190x210cm', category: 'Stands', rental_cost: 300, selling_price: null, is_sellable: false, image_url: IK+'/rentals/stand_rect.jpg' },
        { item_id: 'HV-0014', name: 'Round Arch Balloon Stand (PVC) 5ft x 6ft', category: 'Stands', rental_cost: 375, selling_price: null, is_sellable: false, image_url: IK+'/rentals/stand_arch.jpg' },
        { item_id: 'HV-0020', name: 'Acrylic Glass Flameless LED Candles (Pack of 3)', category: 'Lighting', rental_cost: 300, selling_price: 1560, is_sellable: true, image_url: IK+'/rentals/candles_acrylic.jpg' },
        { item_id: 'HV-0026', name: 'Artificial Silk Rose Petals (Red, 500 pcs)', category: 'Floral', rental_cost: 75, selling_price: 390, is_sellable: true, image_url: IK+'/rentals/petals_rose.jpg' },
        { item_id: 'HV-0032', name: 'Marigold Garlands (Pack of 10)', category: 'Floral', rental_cost: 125, selling_price: 650, is_sellable: true, image_url: IK+'/rentals/marigold.jpg' },
      ].map(i => ({ ...i, id: uuidv4(), qty_available: 1, active: true, created_at: new Date() }))
      await db.collection('rent_items').insertMany(rentItems)

      const kitsToInsert = [
        { kit_code: 'KTS-001', name: 'Boss Baby Blast (KTS-001)', occasion_tags: ['birthday','party','boss baby'], selling_total: 8905, purchase_total: 6850, bom: [{"item":"Latex Balloons (Mix palette)","qty":300,"uom":"pcs","unit_purchase":16.0},{"item":"Foil Backdrop Curtain Silver","qty":1,"uom":"set","unit_purchase":350},{"item":"Foil Number Balloon","qty":1,"uom":"pc","unit_purchase":400},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Boss Baby', audience: 'Kids' },
        { kit_code: 'KTS-002', name: 'Cars Speed Track (KTS-002)', occasion_tags: ['birthday','party','cars'], selling_total: 5590, purchase_total: 4300, bom: [{"item":"Latex Balloons (Red palette)","qty":250,"uom":"pcs","unit_purchase":9.0},{"item":"Foil Backdrop Curtain Red","qty":1,"uom":"set","unit_purchase":350},{"item":"Foil Number Balloon","qty":1,"uom":"pc","unit_purchase":400},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Cars', audience: 'Kids' },
        { kit_code: 'KTS-003', name: 'Cocomelon Garden Pop (KTS-003)', occasion_tags: ['birthday','party','cocomelon'], selling_total: 8905, purchase_total: 6850, bom: [{"item":"Latex Balloons (Mix palette)","qty":300,"uom":"pcs","unit_purchase":16.0},{"item":"Foil Backdrop Curtain Silver","qty":1,"uom":"set","unit_purchase":350},{"item":"Foil Number Balloon","qty":1,"uom":"pc","unit_purchase":400},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Cocomelon', audience: 'Kids' },
        { kit_code: 'KTS-004', name: 'Disney Princess Silver Gala (KTS-004)', occasion_tags: ['birthday','party','disney princess'], selling_total: 10985, purchase_total: 8450, bom: [{"item":"Latex Balloons (Mix palette)","qty":400,"uom":"pcs","unit_purchase":16.0},{"item":"Foil Backdrop Curtain Silver","qty":1,"uom":"set","unit_purchase":350},{"item":"Foil Number Balloon","qty":1,"uom":"pc","unit_purchase":400},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Disney Princess', audience: 'Kids, Girls' },
        { kit_code: 'KTS-012', name: 'Unicorn Sparkle Pastels (KTS-012)', occasion_tags: ['birthday','party','unicorn'], selling_total: 10595, purchase_total: 8150, bom: [{"item":"Latex Balloons (Pastel palette)","qty":400,"uom":"pcs","unit_purchase":14.0},{"item":"Net Backdrop White","qty":1,"uom":"set","unit_purchase":500},{"item":"Foil Backdrop Curtain Silver","qty":1,"uom":"set","unit_purchase":350},{"item":"Foil Number Balloon","qty":1,"uom":"pc","unit_purchase":400},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Unicorn', audience: 'Kids, Girls' },
        { kit_code: 'KTS-013', name: 'Newborn Naming Ceremony (KTS-013)', occasion_tags: ['ceremony','baby_shower','naming ceremony'], selling_total: 6500, purchase_total: 5000, bom: [{"item":"Latex Balloons (Mix palette)","qty":200,"uom":"pcs","unit_purchase":16.0},{"item":"Net Backdrop White","qty":1,"uom":"set","unit_purchase":500},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Naming Ceremony', audience: 'Newborn' },
        { kit_code: 'KTS-018', name: 'Candle Light Dinner Luxe (KTS-018)', occasion_tags: ['anniversary','romantic','valentine','dinner'], selling_total: 10660, purchase_total: 8200, bom: [{"item":"Fresh Roses","qty":50,"uom":"pcs","unit_purchase":50},{"item":"LED Pillar Candles Set of 3","qty":1,"uom":"set","unit_purchase":1200},{"item":"Batteries for LED candles","qty":1,"uom":"set","unit_purchase":200},{"item":"Neon Light Good Vibes Only","qty":1,"uom":"pc","unit_purchase":2300},{"item":"Red Heart Balloons 12 inch","qty":25,"uom":"pcs","unit_purchase":60.0},{"item":"Net Backdrop","qty":1,"uom":"set","unit_purchase":500}], theme: 'Candle Light Dinner', audience: 'Couple' },
        { kit_code: 'KTS-019', name: 'Romantic Room Decor (KTS-019)', occasion_tags: ['anniversary','romantic','valentine'], selling_total: 13787, purchase_total: 10605, bom: [{"item":"Latex Balloons Mix palette","qty":400,"uom":"pcs","unit_purchase":16.0},{"item":"White Net 3 pc set","qty":1,"uom":"set","unit_purchase":355},{"item":"Foil Letters I LOVE YOU 16 inch","qty":7,"uom":"pcs","unit_purchase":150},{"item":"Red Heart Balloons 12 inch","qty":25,"uom":"pcs","unit_purchase":60.0},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Romantic Room', audience: 'Couple' },
        { kit_code: 'KTS-020', name: 'Canopy Decor Premium (KTS-020)', occasion_tags: ['anniversary','romantic','wedding'], selling_total: 8983, purchase_total: 6910, bom: [{"item":"Latex Balloons Mix palette","qty":100,"uom":"pcs","unit_purchase":16.0},{"item":"White Net 3 pc set","qty":5,"uom":"sets","unit_purchase":355},{"item":"LED Curtain String","qty":1,"uom":"set","unit_purchase":755},{"item":"LED Pillar Candles Set of 3","qty":1,"uom":"set","unit_purchase":1200},{"item":"Batteries for LED candles","qty":1,"uom":"set","unit_purchase":200},{"item":"Red Latex Balloons","qty":20,"uom":"pcs","unit_purchase":9.0},{"item":"Red Heart Balloons 12 inch","qty":20,"uom":"pcs","unit_purchase":60.0}], theme: 'Canopy', audience: 'Couple' },
        { kit_code: 'KTS-022', name: 'Anniversary Classic Net (KTS-022)', occasion_tags: ['anniversary','romantic'], selling_total: 9412, purchase_total: 7240, bom: [{"item":"Latex Balloons Mix palette","qty":340,"uom":"pcs","unit_purchase":16.0},{"item":"Net Backdrop Large","qty":1,"uom":"set","unit_purchase":500},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Anniversary', audience: 'Couple' },
        { kit_code: 'KTS-023', name: 'Haldi Celebration Bloom (KTS-023)', occasion_tags: ['haldi','wedding','festival'], selling_total: 12162, purchase_total: 9355, bom: [{"item":"Latex Balloons Mix palette","qty":400,"uom":"pcs","unit_purchase":16.0},{"item":"Colour Net Curtain 8ft x 4ft","qty":1,"uom":"set","unit_purchase":400},{"item":"Net Backdrop Large","qty":1,"uom":"set","unit_purchase":500},{"item":"LED Curtain String","qty":1,"uom":"set","unit_purchase":755},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Haldi', audience: 'Family' },
        { kit_code: 'KTS-024', name: 'Proposal Net & Roses (KTS-024)', occasion_tags: ['engagement','anniversary','proposal'], selling_total: 14177, purchase_total: 10905, bom: [{"item":"Latex Balloons Mix palette","qty":300,"uom":"pcs","unit_purchase":16.0},{"item":"Fresh Roses","qty":50,"uom":"pcs","unit_purchase":50},{"item":"Net Backdrop Large","qty":1,"uom":"set","unit_purchase":500},{"item":"Foil Letters I LOVE YOU 16 inch","qty":7,"uom":"pcs","unit_purchase":150},{"item":"LED Curtain String","qty":1,"uom":"set","unit_purchase":755},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Proposal', audience: 'Couple' },
        { kit_code: 'KTS-025', name: 'Bride To Be Glow (KTS-025)', occasion_tags: ['wedding','engagement','bride shower'], selling_total: 10082, purchase_total: 7755, bom: [{"item":"Latex Balloons Pink palette","qty":400,"uom":"pcs","unit_purchase":8.0},{"item":"Neon Light Bride To Be","qty":1,"uom":"pc","unit_purchase":2000},{"item":"Net Backdrop Large","qty":1,"uom":"set","unit_purchase":500},{"item":"LED Curtain String","qty":1,"uom":"set","unit_purchase":755},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Bride To Be', audience: 'Bride' },
        { kit_code: 'KTS-026', name: 'Holi Color Blast (KTS-026)', occasion_tags: ['festival','holi','party'], selling_total: 5850, purchase_total: 4500, bom: [{"item":"Latex Balloons Mix palette","qty":200,"uom":"pcs","unit_purchase":16.0},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Holi', audience: 'Friends, Family' },
        { kit_code: 'KTS-027', name: 'Neon Party Starburst (KTS-027)', occasion_tags: ['birthday','party','neon'], selling_total: 14560, purchase_total: 11200, bom: [{"item":"Latex Balloons Mix palette","qty":400,"uom":"pcs","unit_purchase":16.0},{"item":"Net Backdrop Large","qty":1,"uom":"set","unit_purchase":500},{"item":"Star Foil Balloons","qty":6,"uom":"pcs","unit_purchase":500},{"item":"Glue Dots","qty":1,"uom":"pc","unit_purchase":250},{"item":"Tape","qty":1,"uom":"pc","unit_purchase":50},{"item":"Ribbon Roll","qty":1,"uom":"pc","unit_purchase":100},{"item":"Fishing String Roll","qty":1,"uom":"pc","unit_purchase":400},{"item":"Zip Tie Packet","qty":1,"uom":"pc","unit_purchase":500}], theme: 'Neon Party', audience: 'Any' },
      ].map(k => ({ ...k, id: uuidv4(), room_types: ['Living Room','Hall','Bedroom'], kit_items: [], reference_images: [], labor_cost: 500, travel_cost: 500, total_items_cost: k.purchase_total, final_price: k.selling_total, setup_time_minutes: 60, difficulty: k.selling_total > 12000 ? 'hard' : k.selling_total > 8000 ? 'medium' : 'easy', color_theme: '', is_active: true, active: true, notes: '', description: k.theme + ' themed decoration for ' + k.audience, created_at: new Date(), updated_at: new Date() }))
      await db.collection('decoration_kits').insertMany(kitsToInsert)

      // Upsert delivery persons by phone — preserves their IDs across re-seeds
      // This ensures orders with delivery_person_id don't become orphaned
      const dpData = [
        { name: 'Rahul Kumar', phone: '9876543210', lat: 18.5204, lng: 73.8567, rating: 4.8, total_deliveries: 156 },
        { name: 'Priya Sharma', phone: '9876543211', lat: 18.5304, lng: 73.8467, rating: 4.9, total_deliveries: 203 },
        { name: 'Amit Singh', phone: '9876543212', lat: 18.5104, lng: 73.8667, rating: 4.7, total_deliveries: 89 },
        { name: 'Neha Patel', phone: '9876543213', lat: 18.5404, lng: 73.8367, rating: 4.6, total_deliveries: 124 }
      ]
      let dpCount = 0
      for (const dp of dpData) {
        const exists = await db.collection('delivery_persons').findOne({ phone: dp.phone })
        if (!exists) {
          await db.collection('delivery_persons').insertOne({ id: uuidv4(), name: dp.name, phone: dp.phone, password: hashPwd('1234'), is_active: true, current_location: { lat: dp.lat, lng: dp.lng, updated_at: new Date() }, schedule: {}, rating: dp.rating, total_deliveries: dp.total_deliveries, created_at: new Date() })
          dpCount++
        }
      }
      const deliveryPersons = await db.collection('delivery_persons').find({}).toArray()

      const adminExists = await db.collection('users').findOne({ email: 'admin@fatafatdecor.com' })
      if (!adminExists) {
        await db.collection('users').insertOne({ id: uuidv4(), name: 'Admin', email: 'admin@fatafatdecor.com', phone: '9999999999', password: hashPwd('admin123'), role: 'admin', credits: 999, has_purchased_credits: true, location: null, auth_provider: 'email', created_at: new Date() })
      }
      return ok({ success: true, items_count: items.length, rent_items_count: rentItems.length, kits_count: kitsToInsert.length, delivery_persons_count: deliveryPersons.length, message: 'Database seeded!' })
    }

    return err(`Route /${path.join('/')} not found`, 404)
  } catch (error) {
    console.error('API Error:', error)
    return err('Internal server error: ' + error.message, 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
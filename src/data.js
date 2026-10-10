const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)

export const seedData = {
  products: [
    { id: 'p1', name: 'Bespoke 8000 Series', brand: 'Philips', category: 'Kitchen', serial: 'PH-88-20491', purchaseDate: day(-240), duration: 24, proof: 'philips-receipt.pdf', notes: 'Purchased at Northstar Home' },
    { id: 'p2', name: 'QuietComfort Ultra', brand: 'Bose', category: 'Electronics', serial: 'BO-QC-77120', purchaseDate: day(-690), duration: 12, proof: 'bose-invoice.jpg', notes: '' },
    { id: 'p3', name: 'XPS 15 Laptop', brand: 'Dell', category: 'Electronics', serial: 'DL-XPS-50128', purchaseDate: day(-95), duration: 12, proof: 'dell-order.pdf', notes: 'Extended support eligible' },
    { id: 'p4', name: 'Air Purifier 300', brand: 'Dyson', category: 'Home', serial: 'DY-AP-31881', purchaseDate: day(-330), duration: 24, proof: '', notes: 'Gift from family' },
  ],
  claims: [
    { id: 'WV-2048', productId: 'p1', issue: 'Motor makes a loud grinding sound', type: 'Repair', status: 'In Repair', submitted: day(-12), updated: day(-1), center: 'Northstar Service Hub', slot: day(2), notes: 'Technician diagnosed worn motor bearings.', history: [{ status: 'Submitted', date: day(-12), note: 'Claim received' }, { status: 'Under Review', date: day(-10), note: 'Eligibility verified' }, { status: 'Approved', date: day(-8), note: 'Covered under manufacturer warranty' }, { status: 'Scheduled', date: day(-5), note: 'Visit confirmed' }, { status: 'In Repair', date: day(-1), note: 'Repair started' }] },
    { id: 'WV-2047', productId: 'p3', issue: 'Battery drains within one hour', type: 'Repair', status: 'Scheduled', submitted: day(-5), updated: day(-2), center: 'TechCare Midtown', slot: day(5), notes: '', history: [{ status: 'Submitted', date: day(-5), note: 'Claim received' }, { status: 'Under Review', date: day(-4), note: 'Review started' }, { status: 'Approved', date: day(-3), note: 'Covered under warranty' }, { status: 'Scheduled', date: day(-2), note: 'Appointment confirmed' }] },
    { id: 'WV-2046', productId: 'p2', issue: 'Left earcup no longer produces sound', type: 'Repair', status: 'Rejected', submitted: day(-20), updated: day(-18), center: '', slot: '', notes: 'Warranty expired before claim date.', history: [{ status: 'Submitted', date: day(-20), note: 'Claim received' }, { status: 'Under Review', date: day(-19), note: 'Review started' }, { status: 'Rejected', date: day(-18), note: 'Outside warranty period' }] },
    { id: 'WV-2045', productId: 'p4', issue: 'Filter replacement and airflow check', type: 'Maintenance', status: 'Completed', submitted: day(-42), updated: day(-30), center: 'Northstar Service Hub', slot: day(-31), notes: 'Filter replaced; airflow tested.', history: [{ status: 'Submitted', date: day(-42), note: 'Claim received' }, { status: 'Approved', date: day(-40), note: 'Service approved' }, { status: 'Scheduled', date: day(-36), note: 'Appointment confirmed' }, { status: 'Completed', date: day(-30), note: 'Service completed' }] },
  ],
  centers: [
    { id: 'c1', name: 'Northstar Service Hub', city: 'Brooklyn, NY', types: ['Repair', 'Maintenance', 'Inspection'], slots: [day(1), day(2), day(4), day(8)] },
    { id: 'c2', name: 'TechCare Midtown', city: 'Manhattan, NY', types: ['Repair', 'Inspection'], slots: [day(3), day(5), day(9)] },
    { id: 'c3', name: 'HomePro Workshop', city: 'Queens, NY', types: ['Maintenance', 'Repair'], slots: [day(2), day(6), day(10)] },
  ],
  team: [{ id: 't1', name: 'Maya Chen', role: 'Team Leader', assigned: 8 }, { id: 't2', name: 'Jordan Lee', role: 'Claims Specialist', assigned: 14 }, { id: 't3', name: 'Sam Rivera', role: 'Service Coordinator', assigned: 11 }],
}

const KEY = 'warrantyvault-demo-v1'
export function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved && ['products', 'claims', 'centers', 'team'].every((key) => Array.isArray(saved[key]))) return saved
  } catch { /* Invalid or unavailable storage falls back to fresh demo data. */ }
  return structuredClone(seedData)
}
export function saveData(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true } catch { return false }
}
export function expiry(product) {
  const date = new Date(product.purchaseDate)
  if (!product.purchaseDate || Number.isNaN(date.getTime()) || !Number.isFinite(Number(product.duration))) return null
  date.setMonth(date.getMonth() + Number(product.duration))
  return date.toISOString().slice(0, 10)
}
export const formatDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
export const id = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

import { useEffect, useMemo, useState } from 'react'
import { expiry, formatDate, id, loadData, saveData } from './data'
import { IN_90_DAYS, TODAY } from './dates'
import Icon from './icons'
import { AdminLogin, CustomerLogin } from './Auth'
import { AdminHome, CustomerHome } from './Dashboards'
import { Empty, ServicePanel, Status } from './ui'
import './App.css'

const nav = { Customer: [['Overview','⌂'],['My products','▣'],['Claims','◇'],['Service history','↻']], 'Team Admin': [['Overview','⌂'],['Claims queue','◇'],['Service centers','⌖']], 'Team Leader': [['Overview','⌂'],['Claims queue','◇'],['Service centers','⌖'],['Team members','♙']] }
const nextStatus = { Submitted: 'Under Review', 'Under Review': 'Approved', Approved: 'Scheduled', Scheduled: 'In Repair', 'In Repair': 'Completed' }
const customerLabels = { Overview: 'Home', 'My products': 'Products', Claims: 'Claims', 'Service history': 'Service history' }
const adminIcons = { Overview: 'grid', 'Claims queue': 'clipboard', 'Service centers': 'pin', 'Team members': 'users' }
const adminGroups = [['CORE OPS', ['Overview', 'Claims queue']], ['DISPATCH & SCHEDULING', ['Service centers']], ['TEAM', ['Team members']]]
const people = { Customer: ['AM', 'Alex Morgan'], 'Team Admin': ['JM', 'Jamie Moore'], 'Team Leader': ['MC', 'Maya Chen'] }

// Demo sign-in state. "Remember me" keeps it in localStorage; otherwise it lasts for the browser session.
const SESSION_KEY = 'warrantyvault-session'
function readSession() {
  for (const store of ['localStorage', 'sessionStorage']) {
    try { const saved = JSON.parse(window[store].getItem(SESSION_KEY)); if (saved && ['customer', 'admin'].includes(saved.type)) return saved } catch { /* storage unavailable */ }
  }
  return null
}
function writeSession(value, remember) {
  for (const store of ['localStorage', 'sessionStorage']) { try { window[store].removeItem(SESSION_KEY) } catch { /* ignore */ } }
  if (!value) return
  try { window[remember ? 'localStorage' : 'sessionStorage'].setItem(SESSION_KEY, JSON.stringify(value)) } catch { /* ignore */ }
}

function App() {
  // Claims saved by older builds could lack a `status`; recover it from their history so they render.
  const [data, setData] = useState(() => { const d = loadData(); return { ...d, claims: d.claims.map((c) => (c.status ? c : { ...c, status: c.history?.[c.history.length - 1]?.status || 'Submitted' })) } })
  const [role, setRole] = useState(() => (readSession()?.type === 'admin' ? 'Team Admin' : 'Customer'))
  const [page, setPage] = useState('Overview')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState('')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({})
  const [session, setSession] = useState(readSession)
  const [authView, setAuthView] = useState(() => readSession()?.type || 'customer')
  const [adminSearch, setAdminSearch] = useState('')
  const mutate = (fn, msg) => { setData((prev) => { const next = fn(structuredClone(prev)); saveData(next); return next }); setToast(msg); setTimeout(() => setToast(''), 2800) }
  const products = data.products
  const claims = data.claims
  const currentProduct = (claim) => products.find((item) => item.id === claim.productId)
  const counts = useMemo(() => {
    const expiries = products.map((p) => expiry(p))
    const today = TODAY
    return { active: expiries.filter((e) => e && e >= today).length, expiring: expiries.filter((e) => e && e >= today && e <= IN_90_DAYS).length, open: claims.filter((c) => !['Completed','Rejected'].includes(c.status)).length }
  }, [products, claims])
  const openModal = (name, value = {}) => { setError(''); setForm(value); setSelected(null); setModal(name) }
  const beginClaim = (product) => openModal('claim', { productId: product?.id || '', type: 'Repair', issue: '' })
  const saveProduct = (event) => {
    event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget))
    if (!f.name || !f.brand || !f.serial || !f.purchaseDate || !f.duration || Number(f.duration) < 1) return setError('Complete all required fields with a valid warranty duration.')
    const saved = { ...f, duration: Number(f.duration), proof: f.proof || '', id: form.id || id('p') }
    mutate((d) => ({ ...d, products: form.id ? d.products.map((p) => p.id === form.id ? saved : p) : [saved, ...d.products] }), form.id ? 'Product updated' : 'Product registered'); setModal('')
  }
  const saveClaim = (event) => {
    event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const p = products.find((x) => x.id === f.productId)
    if (!p || !f.issue.trim()) return setError('Choose a product and describe the issue.')
    const end = expiry(p), today = TODAY
    const duplicate = claims.some((c) => c.productId === p.id && c.issue.toLowerCase().split(/\W+/).some((w) => w.length > 4 && f.issue.toLowerCase().includes(w)) && !['Completed','Rejected'].includes(c.status))
    const status = !end || !p.purchaseDate ? 'Under Review' : end < today ? 'Rejected' : 'Submitted'
    const note = !end ? 'Missing or invalid warranty information; manual review required.' : end < today ? `Demo date check: warranty expired ${formatDate(end)}.` : 'Demo date check: purchase date is within warranty period.'
    if (duplicate && !window.confirm('A similar open claim already exists for this product. Submit this claim anyway?')) return
    const claim = { id: id('WV'), productId: p.id, issue: f.issue.trim(), type: f.type, status, submitted: today, updated: today, center: '', slot: '', notes: '', history: [{ status, date: today, note }] }
    mutate((d) => ({ ...d, claims: [claim, ...d.claims] }), duplicate ? 'Claim submitted with duplicate warning' : 'Claim submitted'); setModal('')
  }
  const updateClaim = (claim, status, note = '') => mutate((d) => ({ ...d, claims: d.claims.map((c) => c.id === claim.id ? { ...c, status, updated: TODAY, notes: note || c.notes, history: [...c.history, { status, date: TODAY, note: note || `Status updated to ${status}` }] } : c) }), `Claim moved to ${status}`)
  const schedule = (event) => {
    event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const center = data.centers.find((c) => c.id === f.centerId)
    if (!center || !center.types.includes(selected.type)) return setError('This center does not support the selected service type.')
    if (!center.slots.includes(f.slot) || claims.some((c) => c.center === center.name && c.slot === f.slot && c.id !== selected.id && !['Completed','Rejected'].includes(c.status))) return setError('That appointment slot is unavailable. Choose another date.')
    mutate((d) => ({ ...d, claims: d.claims.map((c) => c.id === selected.id ? { ...c, center: center.name, slot: f.slot, status: 'Scheduled', updated: TODAY, notes: f.notes, history: [...c.history, { status: 'Scheduled', date: TODAY, note: `Scheduled at ${center.name} on ${formatDate(f.slot)}${f.notes ? ` · ${f.notes}` : ''}` }] } : c) }), 'Appointment scheduled'); setModal('')
  }
  const shownProducts = products.filter((p) => `${p.name} ${p.brand} ${p.category} ${p.serial}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || (filter === 'Active' ? expiry(p) >= TODAY : expiry(p) < TODAY)))
  const shownClaims = claims.filter((c) => `${c.id} ${c.issue} ${currentProduct(c)?.name || ''}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || c.status === filter))
  const isCustomer = role === 'Customer'
  const hub = session?.hub || ''
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800) }
  const openDetails = (claim) => { setError(''); setSelected(claim); setModal('details') }
  const openSchedule = (claim) => { setError(''); setSelected(claim); setModal('schedule') }
  const resetView = () => { setPage('Overview'); setQuery(''); setFilter('All'); setModal(''); setError('') }
  const signIn = (type, { remember = true, hubName = '' } = {}) => { const next = { type, hub: hubName }; writeSession(next, remember); setSession(next); setRole(type === 'admin' ? 'Team Admin' : 'Customer'); resetView() }
  const signOut = () => { setAuthView(session?.type || 'customer'); writeSession(null); setSession(null); setRole('Customer'); resetView() }
  useEffect(() => { document.title = session ? (isCustomer ? 'WarrantyVault' : 'WarrantyVault · Control room') : 'WarrantyVault · Sign in' }, [session, isCustomer])

  const toastEl = toast && <div className="toast" role="status">✓ &nbsp;{toast}</div>
  if (!session) {
    return <>
      {authView === 'customer'
        ? <CustomerLogin products={products} notify={notify} onSwitch={() => setAuthView('admin')} onSignIn={(remember) => signIn('customer', { remember })} />
        : <AdminLogin centers={data.centers} claims={claims} products={products} onSwitch={() => setAuthView('customer')} onSignIn={(hubName) => signIn('admin', { remember: false, hubName })} />}
      {toastEl}
    </>
  }

  const title = page === 'Overview' ? (isCustomer ? 'Welcome back, Alex.' : 'Operations overview') : page
  const subtitle = page === 'Overview' ? (isCustomer ? 'Here’s what’s happening with your products.' : 'Your service operations at a glance.') : `Manage ${page.toLowerCase()} in one place.`
  const resolvedShare = claims.length ? Math.round((claims.filter((c) => ['Completed', 'Rejected'].includes(c.status)).length / claims.length) * 100) : 0
  const goTo = (name) => { setPage(name); setQuery(''); setFilter('All') }

  const footer = <footer className="footer"><span>© 2025 WarrantyVault</span><span>DEMO LOGIC · WARRANTIES ARE NOT VERIFIED WITH MANUFACTURERS</span><a href="#privacy" onClick={(e)=>{e.preventDefault();setToast('Demo data is stored locally in this browser only')}}>Privacy & data</a></footer>

  const customerExtras = <>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-head"><div><h2>Recent activity</h2><p>Your latest warranty updates</p></div><button className="text-button" onClick={()=>setPage('Claims')}>View all →</button></div><div className="activity-list">{claims.slice(0,4).map((c,i)=><div className="activity-row" key={c.id}><div className={`activity-icon activity-${i%4}`}>{c.status==='Completed'?'✓':'◇'}</div><div className="activity-copy"><strong>{c.issue}</strong><span>{currentProduct(c)?.name} · {c.id}</span></div><Status value={c.status}/><time>{formatDate(c.updated)}</time></div>)}</div></section><ServicePanel claims={claims} productFor={currentProduct} onOpen={openDetails} onHistory={()=>setPage('Service history')}/></div>
    <section className="panel product-preview"><div className="panel-head"><div><h2>Your products</h2><p>Warranty coverage at a glance</p></div><button className="text-button" onClick={()=>setPage('My products')}>View all products →</button></div><ProductTable products={products.slice(0,3)} onEdit={(p)=>openModal('product',p)} onClaim={beginClaim}/></section>
  </>

  const pageBody = <>
    {page==='Overview'&&(isCustomer
      ? <><CustomerHome products={products} claims={claims} counts={counts} productFor={currentProduct} openModal={openModal} beginClaim={beginClaim} openDetails={openDetails}/>{customerExtras}</>
      : <AdminHome role={role} claims={claims} productFor={currentProduct} nextStatus={nextStatus} updateClaim={updateClaim} openDetails={openDetails} openSchedule={openSchedule} setPage={setPage}/>)}
      {page==='My products'&&<section className="panel table-panel"><Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} options={['All','Active','Expired']} placeholder="Search products…"/><ProductTable products={shownProducts} onEdit={(p)=>openModal('product',p)} onClaim={beginClaim}/>{!shownProducts.length&&<Empty title="No products found" text="Try changing your search or register a product." action={()=>openModal('product')}/>}</section>}
      {(page==='Claims'||page==='Claims queue'||page==='Service history')&&<section className="panel table-panel"><Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} options={page==='Service history'?['All','Completed','In Repair','Scheduled']:['All','Submitted','Under Review','Approved','Rejected','Scheduled','In Repair','Completed']} placeholder="Search claims or products…"/><ClaimTable claims={page==='Service history'?shownClaims.filter((c)=>['Completed','In Repair','Scheduled'].includes(c.status)):shownClaims} productFor={currentProduct} onOpen={(c)=>{setSelected(c);setModal('details')}} onStatus={updateClaim} onSchedule={(c)=>{setSelected(c);setModal('schedule')}} staff={role!=='Customer'}/>{!shownClaims.length&&<Empty title="No claims to show" text="Submitted claims and service updates will appear here." action={role==='Customer'?()=>beginClaim():null}/>}</section>}
      {page==='Service centers'&&<section className="center-grid">{data.centers.map((c)=><article className="panel center-card" key={c.id}><div className="center-top"><span className="center-icon">⌖</span><span className="availability"><i/> Accepting appointments</span></div><h2>{c.name}</h2><p>⌖ {c.city}</p><div className="eyebrow">SUPPORTED SERVICES</div><div className="chips">{c.types.map((t)=><span key={t}>{t}</span>)}</div><div className="center-bottom"><span>Next available <strong>{formatDate(c.slots[0])}</strong></span><span>{c.slots.length} slots</span></div></article>)}</section>}
      {page==='Team members'&&<section className="panel table-panel"><div className="panel-head team-head"><div><h2>Your service team</h2><p>People keeping every claim moving</p></div><button className="primary-button" onClick={()=>setToast('Team member invitations are demo-only')}>＋ Invite member</button></div><div className="team-list">{data.team.map((member)=> <div className="team-row" key={member.id}><div className="avatar">{member.name.split(' ').map((x)=>x[0]).join('')}</div><div className="team-person"><strong>{member.name}</strong><span>{member.role}</span></div><span className="assignment-count">{member.assigned} <small>active claims</small></span><span className="member-active"><i/> Active</span><button className="panel-more" aria-label={`Options for ${member.name}`}>···</button></div>)}</div></section>}
  </>

  const headingActions = <>
    {isCustomer&&page==='Overview'&&<button className="primary-button" onClick={()=>beginClaim()}><Icon name="wrench" size={16}/> Get service</button>}
    {page==='My products'&&<button className="primary-button" onClick={()=>openModal('product')}><Icon name="plus" size={16}/> Add a product</button>}
    {(page==='Claims'||page==='Claims queue')&&isCustomer&&<button className="primary-button" onClick={()=>beginClaim()}><Icon name="plus" size={16}/> Submit a claim</button>}
  </>

  const overlays = <>
    {toast&&<div className="toast" role="status">✓ &nbsp;{toast}</div>}{modal&&<div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setModal('')}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><div className="eyebrow">WARRANTYVAULT</div><h2 id="modal-title">{modal==='product'?form.id?'Edit product':'Register a product':modal==='claim'?'Submit a claim':modal==='schedule'?'Schedule service':'Claim details'}</h2></div><button className="close-button" aria-label="Close" onClick={()=>setModal('')}>×</button></div>
      {modal==='product'&&<form onSubmit={saveProduct} className="form-grid"><Field label="Product name" name="name" value={form.name}/><Field label="Brand" name="brand" value={form.brand}/><Field label="Category" name="category" value={form.category} placeholder="Electronics, Home…"/><Field label="Serial number" name="serial" value={form.serial}/><Field label="Purchase date" name="purchaseDate" type="date" value={form.purchaseDate} max={TODAY}/><Field label="Warranty (months)" name="duration" type="number" value={form.duration} min="1"/><Field label="Proof of purchase filename" name="proof" value={form.proof} placeholder="receipt.pdf"/><label className="field full-field">Notes<textarea name="notes" defaultValue={form.notes} rows="3"/></label><div className="form-foot"><span className="form-hint">Expiry is calculated from purchase date and duration.</span><button className="primary-button">Save product</button></div></form>}
      {modal==='claim'&&<form onSubmit={saveClaim} className="form-grid"><label className="field full-field">Product<select name="productId" defaultValue={form.productId} required><option value="">Select a product</option>{products.map((p)=><option value={p.id} key={p.id}>{p.brand} {p.name} · {p.serial}</option>)}</select></label><label className="field">Service type<select name="type" defaultValue={form.type}><option>Repair</option><option>Maintenance</option><option>Inspection</option></select></label><div className="eligibility-note">◉ <span>Eligibility is an estimate based on your purchase date, not manufacturer verification.</span></div><label className="field full-field">Describe the issue<textarea name="issue" rows="4" defaultValue={form.issue} placeholder="Tell us what happened…" required/></label><p className="form-hint full-field">Similar active claims will be flagged before submission. Claims with missing dates need manual review.</p><div className="form-foot full-field"><span/><button className="primary-button">Submit claim</button></div></form>}
      {modal==='schedule'&&selected&&<form onSubmit={schedule} className="form-grid"><div className="context-card full-field"><strong>{selected.id} · {selected.issue}</strong><span>{currentProduct(selected)?.name} · {selected.type}</span></div><label className="field full-field">Service center<select name="centerId" defaultValue="" required><option value="">Choose a compatible center</option>{data.centers.map((c)=><option key={c.id} value={c.id} disabled={!c.types.includes(selected.type)}>{c.name} · {c.city}{!c.types.includes(selected.type)?' (unavailable for this service)':''}</option>)}</select></label><label className="field full-field">Appointment slot<select name="slot" defaultValue="" required><option value="">Select a date</option>{data.centers.flatMap((c)=>c.slots.map((slot)=><option key={`${c.id}-${slot}`} value={slot}>{formatDate(slot)} · {c.name}{claims.some((cl)=>cl.center===c.name&&cl.slot===slot&&cl.id!==selected.id&&!['Completed','Rejected'].includes(cl.status))?' (unavailable)':''}</option>))}</select><small>Availability is checked again when you save.</small></label><label className="field full-field">Repair notes<textarea name="notes" rows="3" defaultValue={selected.notes} placeholder="Add details for the service team…"/></label><div className="form-foot full-field"><span/><button className="primary-button">Confirm appointment</button></div></form>}
      {modal==='details'&&selected&&<><div className="detail-summary"><div><span>CLAIM ID</span><strong>{selected.id}</strong></div><div><span>STATUS</span><Status value={selected.status}/></div><div><span>PRODUCT</span><strong>{currentProduct(selected)?.brand} {currentProduct(selected)?.name}</strong></div><div><span>ISSUE</span><strong>{selected.issue}</strong></div>{selected.center&&<div><span>SERVICE VISIT</span><strong>{selected.center} · {formatDate(selected.slot)}</strong></div>}</div><div className="timeline-title">Claim timeline</div><div className="timeline">{selected.history.map((h,i)=><div className="timeline-item" key={`${h.status}-${i}`}><span className={`timeline-dot ${i===selected.history.length-1?'current':''}`}/><div><strong>{h.status}</strong><time>{formatDate(h.date)}</time><p>{h.note}</p></div></div>)}</div>{selected.notes&&<div className="notes-box"><strong>Service notes</strong><p>{selected.notes}</p></div>}<div className="modal-actions">{role!=='Customer'&&selected.status==='Approved'&&<button className="primary-button" onClick={()=>{setModal('schedule')}}>Schedule service</button>}{role!=='Customer'&&nextStatus[selected.status]&&selected.status!=='Approved'&&<button className="primary-button" onClick={()=>{updateClaim(selected,nextStatus[selected.status]);setModal('')}}>Move to {nextStatus[selected.status]}</button>}{role!=='Customer'&&['Submitted','Under Review'].includes(selected.status)&&<button className="outline-button reject-button" onClick={()=>{updateClaim(selected,'Rejected','Rejected after team review.');setModal('')}}>Reject claim</button>}<button className="outline-button" onClick={()=>setModal('')}>Close</button></div></>}
      {error&&<div className="error-message" role="alert">{error}</div>}</section></div>}
  </>

  return <div className={`app ${isCustomer ? 'theme-customer' : 'theme-admin'}`}>
    {isCustomer ? <header className="c-top"><div className="c-top-inner">
      <a className="c-brand" href="#home" onClick={(e)=>{e.preventDefault();goTo('Overview')}}><span className="c-brand-mark"><Icon name="key" size={18}/></span><span><b>WarrantyVault</b><small>CARE, MADE SIMPLE</small></span></a>
      <nav className="c-nav" aria-label="Main navigation">{nav.Customer.map(([name])=><button key={name} className={`c-nav-link ${page===name?'active':''}`} aria-current={page===name?'page':undefined} onClick={()=>goTo(name)}>{customerLabels[name]}</button>)}</nav>
      <div className="c-actions"><button className="mint-btn" onClick={()=>openModal('product')}><Icon name="plus" size={16}/> Add product</button><button className="icon-btn" aria-label="Contact support" onClick={()=>notify('Support: hello@warrantyvault.demo')}><Icon name="help" size={18}/></button><button className="icon-btn" aria-label="Notifications" onClick={()=>notify('You’re all caught up')}><Icon name="bell" size={18}/><i/></button><div className="avatar" title={people[role][1]}>{people[role][0]}</div><button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="log-out" size={18}/></button></div>
    </div></header>
    : <aside className="a-side">
      <a className="a-brand" href="#home" onClick={(e)=>{e.preventDefault();setPage('Overview')}}><span className="a-brand-mark"><Icon name="shield-check" size={18}/></span><span><b>WarrantyVault</b><small>CONTROL ROOM</small></span></a>
      <nav aria-label="Main navigation">{adminGroups.map(([label,items])=>{const shown=items.filter((n)=>nav[role].some(([name])=>name===n));return shown.length?<div className="nav-group" key={label}><div className="nav-caption">{label}</div>{shown.map((name)=><button key={name} className={`nav-link ${page===name?'active':''}`} aria-current={page===name?'page':undefined} onClick={()=>goTo(name)}><Icon name={adminIcons[name]} size={16}/>{name}{name==='Claims queue'&&<b className="nav-count">{counts.open}</b>}</button>)}</div>:null})}</nav>
      <div className="a-side-bottom"><div className="health"><div className="health-top"><span>CLAIMS RESOLVED</span><b>{resolvedShare}%</b></div><div className="health-bar"><i style={{width:`${resolvedShare}%`}}/></div></div><div className="demo-note">DEMO MODE <span>•</span> Data stays in this browser</div></div>
    </aside>}
    <main className={isCustomer?'c-main':'a-main'}>
      {!isCustomer&&<header className="a-top">
        <label className="a-search"><Icon name="search" size={15}/><input value={adminSearch} onChange={(e)=>setAdminSearch(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){setPage('Claims queue');setFilter('All');setQuery(adminSearch);setAdminSearch('')}}} placeholder="Search claims…" aria-label="Search claims"/></label>
        <div className="breadcrumbs">Control room <span>/</span> <strong>{page}</strong></div>
        <div className="a-top-actions"><div className="seg" role="group" aria-label="Team role">{['Team Admin','Team Leader'].map((r)=><button key={r} className={role===r?'on':''} aria-pressed={role===r} onClick={()=>{setRole(r);goTo('Overview')}}>{r}</button>)}</div>{hub&&<span className="hub-pill"><i/> {hub}</span>}<button className="icon-btn" aria-label="Notifications" onClick={()=>notify('You’re all caught up')}><Icon name="bell" size={17}/><i/></button><div className="user-chip"><div className="avatar">{people[role][0]}</div><span><strong>{people[role][1]}</strong><small>{role}</small></span></div><button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="log-out" size={17}/></button></div>
      </header>}
      <div className={isCustomer?'c-content':'a-content'}>
        <section className="page-heading"><div><div className="eyebrow">{new Date(TODAY + 'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase()}</div><h1>{title}</h1><p>{subtitle}</p></div>{headingActions}</section>
        {pageBody}
        {footer}
      </div>
    </main>
    {overlays}
  </div>
}

function Toolbar({query,setQuery,filter,setFilter,options,placeholder}) { return <div className="toolbar"><label className="searchbox"><span>⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder}/></label><label className="filterbox"><span>☷</span><select value={filter} onChange={(e)=>setFilter(e.target.value)} aria-label="Filter records">{options.map((x)=><option key={x}>{x}</option>)}</select></label></div> }
function ProductTable({products,onEdit,onClaim}) { if(!products.length)return <Empty title="No products registered" text="Add products to keep their purchase details and warranty coverage together." onClick={onEdit}/>; return <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SERIAL NUMBER</th><th>PURCHASED</th><th>WARRANTY ENDS</th><th>STATUS</th><th/></tr></thead><tbody>{products.map((p)=><tr key={p.id}><td><div className="product-cell"><span className="product-thumb">{p.category==='Kitchen'?'♨':p.category==='Home'?'⌂':'▣'}</span><span><strong>{p.name}</strong><small>{p.brand} · {p.category||'Product'}</small></span></div></td><td className="serial-cell">{p.serial}</td><td>{formatDate(p.purchaseDate)}</td><td>{formatDate(expiry(p))}</td><td><Warranty product={p}/></td><td><div className="row-actions"><button aria-label={`Start claim for ${p.name}`} title="New claim" onClick={()=>onClaim(p)}>◇</button><button aria-label={`Edit ${p.name}`} title="Edit product" onClick={()=>onEdit(p)}>↗</button></div></td></tr>)}</tbody></table></div> }
function Warranty({product}) { const end=expiry(product);const today=TODAY; if(!end)return <Status value="Under Review"/>;return <span className={`warranty ${end<today?'expired':''}`}><i/>{end<today?'Expired':'Active'}</span> }
function ClaimTable({claims,productFor,onOpen,onStatus,onSchedule,staff}) { if(!claims.length)return <Empty title="No claims found" text="Try another filter or search term."/>;return <div className="table-scroll"><table><thead><tr><th>CLAIM</th><th>PRODUCT</th><th>ISSUE</th><th>SUBMITTED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{claims.map((c)=><tr key={c.id}><td><button className="claim-id" onClick={()=>onOpen(c)}>{c.id}</button></td><td><strong>{productFor(c)?.name||'Unknown product'}</strong><small className="subcell">{productFor(c)?.brand}</small></td><td className="issue-cell">{c.issue}</td><td>{formatDate(c.submitted)}</td><td><Status value={c.status}/></td><td>{staff&&c.status==='Approved'?<button className="table-action" onClick={()=>onSchedule(c)}>Schedule →</button>:staff&&nextStatus[c.status]&&c.status!=='Approved'?<button className="table-action" onClick={()=>onStatus(c,nextStatus[c.status])}>{nextStatus[c.status]} →</button>:<button className="row-action-single" aria-label="View claim" onClick={()=>onOpen(c)}>↗</button>}<button className="row-action-single" aria-label="View timeline" onClick={()=>onOpen(c)}> ···</button></td></tr>)}</tbody></table></div> }
function Field({label,name,value,type='text',placeholder,min,max}) { return <label className="field">{label}<input name={name} type={type} defaultValue={value||''} placeholder={placeholder} min={min} max={max} required/></label> }

export default App

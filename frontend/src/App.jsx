import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Rocket, ArrowRight, Building2, Euro, Calendar, ExternalLink, Search, Filter, X, LogIn, UserPlus, LogOut, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './contexts/AuthContext'
import './App.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STRIPE_PK = import.meta.env.VITE_STRIPE_PK

const PLANES = {
  pro: {
    priceId: 'price_1TP8RZDwJ53fjQyspnaGGQS6',
    nombre: 'Pro',
    precio: '49',
  },
  enterprise: {
    priceId: 'price_1TP8S3DwJ53fjQysLUpFsKAC',
    nombre: 'Enterprise',
    precio: '199',
  }
}

// ============================================
// HEADER
// ============================================
function Header() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <div className="logo-icon"><Rocket size={20} /></div>
          Licita AI
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Inicio</Link>
          <Link to="/licitaciones" className="nav-link">Licitaciones</Link>
          <Link to="/precios" className="nav-link">Precios</Link>
          {user ? (
            <button onClick={handleSignOut} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
              <LogOut size={16} /> Salir
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-link"><LogIn size={16} /> Login</Link>
              <Link to="/registro" className="btn btn-primary" style={{ marginLeft: '1rem' }}>
                <UserPlus size={16} /> Registro
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  return (
    <footer className="footer">
      <p>Licita AI - Transformando licitaciones publicas en oportunidades de negocio</p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>© 2026 Licita AI. Todos los derechos reservados.</p>
    </footer>
  )
}

// ============================================
// HOME
// ============================================
function Home() {
  return (
    <>
      <section className="hero">
        <h1>Licita AI</h1>
        <p>Descubre oportunidades de negocio en licitaciones publicas del sector tecnologico</p>
      </section>

      <div className="filters">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Buscar por palabra clave</label>
            <input type="text" placeholder="Ej: software, cloud, IA..." id="busqueda" />
          </div>
          <div className="filter-group">
            <label>Organismo</label>
            <input type="text" placeholder="Ej: Ministerio, Ayuntamiento..." id="organismo-home" />
          </div>
          <div className="filter-group">
            <label>Tecnologia</label>
            <select id="tecnologia-home">
              <option value="">Todas</option>
              <option value="Python">Python</option>
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="React">React</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Ciberseguridad">Ciberseguridad</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={() => {
              const q = document.getElementById('busqueda').value
              const org = document.getElementById('organismo-home').value
              const tech = document.getElementById('tecnologia-home').value
              const params = new URLSearchParams()
              if (q) params.set('q', q)
              if (org) params.set('organismo', org)
              if (tech) params.set('tecnologia', tech)
              window.location.href = `/licitaciones?${params.toString()}`
            }}>
              <Search size={18} /> Buscar
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Search size={32} /></div>
            <h3>Busqueda Inteligente</h3>
            <p>Filtra por tecnologia, organismo, presupuesto y fecha para encontrar exactamente lo que buscas</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Rocket size={32} /></div>
            <h3>Analisis con IA</h3>
            <p>Cada licitacion es procesada con IA para extraer informacion clave y resumenes ejecutivos</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Building2 size={32} /></div>
            <h3>Actualizacion Diaria</h3>
            <p>Nuevas licitaciones cada dia para que nunca pierdas una oportunidad de negocio</p>
          </div>
        </div>

        <div className="cta-section">
          <h2>¿Listo para encontrar tu proxima oportunidad?</h2>
          <Link to="/licitaciones" className="btn btn-primary btn-large">
            Ver Licitaciones <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </>
  )
}

// ============================================
// CARD LICITACION
// ============================================
function LicitacionCard({ licitacion }) {
  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  const formatPresupuesto = (p) => {
    if (!p) return 'No especificado'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(p)
  }

  return (
    <article className="card">
      <div className="card-header">
        <h3 className="card-title">{licitacion.titulo}</h3>
        <span className="card-badge badge-active">{licitacion.estado || 'activa'}</span>
      </div>
      <p className="card-organismo"><Building2 size={16} />{licitacion.organismo}</p>
      <p className="card-presupuesto"><Euro size={20} />{formatPresupuesto(licitacion.presupuesto)}</p>
      <p className="card-resumen">{licitacion.resumen_comercial}</p>
      {licitacion.tecnologias?.length > 0 && (
        <div className="card-tags">
          {licitacion.tecnologias.slice(0, 5).map((tech, i) => (
            <span key={i} className="tag">{tech}</span>
          ))}
        </div>
      )}
      <div className="card-footer">
        <span className="card-date"><Calendar size={14} />{formatDate(licitacion.fecha_publicacion)}</span>
        <a href={licitacion.url_origen} target="_blank" rel="noopener noreferrer" className="btn-link">
          Ver original <ExternalLink size={16} />
        </a>
      </div>
    </article>
  )
}

// ============================================
// LICITACIONES (directo a Supabase)
// ============================================
function Licitaciones() {
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [organismo, setOrganismo] = useState('')
  const [tecnologia, setTecnologia] = useState('')
  const [presupuestoMin, setPresupuestoMin] = useState('')
  const [presupuestoMax, setPresupuestoMax] = useState('')
  const LIMIT = 20

  const fetchLicitaciones = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('licitaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * LIMIT, page * LIMIT - 1)

      if (organismo) query = query.ilike('organismo', `%${organismo}%`)
      if (tecnologia) query = query.contains('tecnologias', [tecnologia])
      if (presupuestoMin) query = query.gte('presupuesto', parseFloat(presupuestoMin))
      if (presupuestoMax) query = query.lte('presupuesto', parseFloat(presupuestoMax))

      const { data, error } = await query
      if (error) throw error
      setLicitaciones(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLicitaciones() }, [page, organismo, tecnologia, presupuestoMin, presupuestoMax])

  const clearFilters = () => {
    setOrganismo(''); setTecnologia(''); setPresupuestoMin(''); setPresupuestoMax(''); setPage(1)
  }

  return (
    <>
      <section className="hero" style={{ padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Licitaciones</h1>
        <p>Explora todas las licitaciones disponibles</p>
      </section>

      <div className="filters">
        <div className="filters-grid">
          <div className="filter-group">
            <label><Building2 size={14} style={{ display: 'inline', marginRight: '4px' }} /> Organismo</label>
            <input type="text" placeholder="Ej: Ministerio..." value={organismo} onChange={(e) => setOrganismo(e.target.value)} />
          </div>
          <div className="filter-group">
            <label><Filter size={14} style={{ display: 'inline', marginRight: '4px' }} /> Tecnologia</label>
            <select value={tecnologia} onChange={(e) => setTecnologia(e.target.value)}>
              <option value="">Todas</option>
              <option value="Python">Python</option>
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Ciberseguridad">Ciberseguridad</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Presupuesto Min</label>
            <input type="number" placeholder="€" value={presupuestoMin} onChange={(e) => setPresupuestoMin(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Presupuesto Max</label>
            <input type="number" placeholder="€" value={presupuestoMax} onChange={(e) => setPresupuestoMax(e.target.value)} />
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={() => { setPage(1); fetchLicitaciones() }}>
              <Search size={18} /> Filtrar
            </button>
            <button className="btn btn-secondary" onClick={clearFilters}>
              <X size={18} /> Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="loading"><div className="spinner"></div><p>Cargando licitaciones...</p></div>
        ) : error ? (
          <div className="error"><p>Error: {error}</p></div>
        ) : licitaciones.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>No se encontraron licitaciones</h3>
            <p>Prueba ajustando los filtros o vuelve mas tarde</p>
          </div>
        ) : (
          <>
            <div className="licitaciones-grid">
              {licitaciones.map((l) => <LicitacionCard key={l.id} licitacion={l} />)}
            </div>
            <div className="pagination">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
              <span className="pagination-btn active">{page}</span>
              <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={licitaciones.length < LIMIT}>Siguiente</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ============================================
// PRECIOS CON STRIPE
// ============================================
function Precios() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState(null)

  const handlePlanClick = async (planKey) => {
    if (planKey === 'free') {
      navigate('/registro')
      return
    }

    if (!user) {
      navigate('/login')
      return
    }

    setLoadingPlan(planKey)

    try {
      const plan = PLANES[planKey]

      // Cargar Stripe dinamicamente
      const { loadStripe } = await import('@stripe/stripe-js')
      const stripe = await loadStripe(STRIPE_PK)

      // Redirigir a Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: plan.priceId, quantity: 1 }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/licitaciones?suscripcion=ok`,
        cancelUrl: `${window.location.origin}/precios`,
        customerEmail: user.email,
      })

      if (error) {
        alert('Error al procesar el pago: ' + error.message)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoadingPlan(null)
    }
  }

  const plans = [
    {
      key: 'free',
      name: 'Free',
      precio: '0',
      descripcion: 'Para explorar la plataforma',
      features: ['5 licitaciones/dia', 'Filtros basicos', 'Busquedas simples', 'Soporte por email'],
      cta: 'Empezar Gratis',
      highlighted: false
    },
    {
      key: 'pro',
      name: 'Pro',
      precio: '49',
      descripcion: 'Para empresas que buscan oportunidades activamente',
      features: ['Licitaciones ilimitadas', 'Alertas email diarias', 'Filtros avanzados', 'Exportar a PDF/Excel', 'API Access', 'Soporte prioritario'],
      cta: 'Suscribirse Pro',
      highlighted: true
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      precio: '199',
      descripcion: 'Para consultoras y grandes equipos',
      features: ['Todo lo de Pro', 'Multi-usuario (hasta 10)', 'Webhooks personalizados', 'SLA garantizado', 'Soporte dedicado 24/7', 'White-label disponible'],
      cta: 'Contactar Ventas',
      highlighted: false
    }
  ]

  return (
    <div className="pricing-container">
      <section className="pricing-header">
        <h1>Planes y Precios</h1>
        <p>Elige el plan que mejor se adapte a tu negocio</p>
      </section>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div key={plan.key} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
            {plan.highlighted && <span className="pricing-badge">Mas Popular</span>}
            <h3 className="pricing-name">{plan.name}</h3>
            <div className="pricing-price">
              <span className="price">€{plan.precio}</span>
              <span className="period">/mes</span>
            </div>
            <p className="pricing-description">{plan.descripcion}</p>
            <ul className="pricing-features">
              {plan.features.map((f, i) => (
                <li key={i}>
                  <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} btn-block`}
              onClick={() => handlePlanClick(plan.key)}
              disabled={loadingPlan === plan.key}
            >
              {loadingPlan === plan.key ? 'Procesando...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <section style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¿Tienes dudas?</h2>
        <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
          Todos los planes incluyen acceso inmediato. Puedes cancelar cuando quieras.
        </p>
        <a href="mailto:hola@licita-ai.com" className="btn btn-secondary">Contactar soporte</a>
      </section>
    </div>
  )
}

// ============================================
// LOGIN
// ============================================
function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn(email, password)
    if (result.success) {
      navigate('/licitaciones')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Iniciar Sesion</h1>
        <p className="auth-subtitle">Accede a tu cuenta de Licita AI</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" required />
          </div>
          <div className="form-group">
            <label>Contrasena</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Sesion'}
          </button>
        </form>
        <p className="auth-footer">¿No tienes cuenta? <Link to="/registro">Registrate gratis</Link></p>
      </div>
    </div>
  )
}

// ============================================
// REGISTRO
// ============================================
function Registro() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({ nombre: '', empresa: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden')
      return
    }
    if (formData.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const result = await signUp(formData.email, formData.password, formData.nombre, formData.empresa)
    if (result.success) {
      setExito(true)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  if (exito) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1>¡Cuenta creada!</h1>
          <p className="auth-subtitle">Revisa tu email para verificar tu cuenta y luego inicia sesion.</p>
          <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }}>
            Ir al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Crear Cuenta</h1>
        <p className="auth-subtitle">Unete a Licita AI y encuentra oportunidades de negocio</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre completo</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Juan Garcia" required />
          </div>
          <div className="form-group">
            <label>Empresa</label>
            <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} placeholder="Tu Empresa S.L." />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@empresa.com" required />
          </div>
          <div className="form-group">
            <label>Contrasena</label>
            <input type="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <div className="form-group">
            <label>Confirmar contrasena</label>
            <input type="password" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>
        <p className="auth-footer">¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link></p>
      </div>
    </div>
  )
}

// ============================================
// APP PRINCIPAL
// ============================================
function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Cargando...</p></div>
  }

  return (
    <Router>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/licitaciones" element={<Licitaciones />} />
            <Route path="/precios" element={<Precios />} />
            <Route path="/pricing" element={<Precios />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App

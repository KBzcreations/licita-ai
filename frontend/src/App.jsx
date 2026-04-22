import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { Rocket, ArrowRight, Building2, Euro, Calendar, ArrowLeft, ExternalLink, Search, Filter, X, LogIn, UserPlus, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from './contexts/AuthContext'
import './App.css'

// ============================================
// CONFIGURACION
// ============================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

// ============================================
// COMPONENTES
// ============================================

// Header con navegacion
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
          <div className="logo-icon">
            <Rocket size={20} />
          </div>
          Licita AI
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Inicio</Link>
          <Link to="/licitaciones" className="nav-link">Licitaciones</Link>
          <Link to="/pricing" className="nav-link">Precios</Link>
          {user ? (
            <button onClick={handleSignOut} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
              <LogOut size={16} />
              Salir
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                <LogIn size={16} />
                Login
              </Link>
              <Link to="/registro" className="btn btn-primary" style={{ marginLeft: '1rem' }}>
                <UserPlus size={16} />
                Registro
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

// Footer
function Footer() {
  return (
    <footer className="footer">
      <p>Licita AI - Transformando licitaciones publicas en oportunidades de negocio</p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>© 2026 Licita AI. Todos los derechos reservados.</p>
    </footer>
  )
}

// Pagina de inicio
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
            <input
              type="text"
              placeholder="Ej: software, cloud, IA..."
              id="busqueda"
            />
          </div>
          <div className="filter-group">
            <label>Organismo</label>
            <input
              type="text"
              placeholder="Ej: Ministerio, Ayuntamiento..."
              id="organismo-home"
            />
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
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Kubernetes">Kubernetes</option>
              <option value="Docker">Docker</option>
              <option value="Machine Learning">Machine Learning</option>
            </select>
          </div>
          <div className="filter-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                const busqueda = document.getElementById('busqueda').value
                const organismo = document.getElementById('organismo-home').value
                const tecnologia = document.getElementById('tecnologia-home').value
                const params = new URLSearchParams()
                if (busqueda) params.set('q', busqueda)
                if (organismo) params.set('organismo', organismo)
                if (tecnologia) params.set('tecnologia', tecnologia)
                window.location.href = `/licitaciones?${params.toString()}`
              }}
            >
              <Search size={18} />
              Buscar
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Search size={32} />
            </div>
            <h3>Busqueda Inteligente</h3>
            <p>Filtra por tecnologia, organismo, presupuesto y fecha para encontrar exactamente lo que buscas</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Rocket size={32} />
            </div>
            <h3>Analisis con IA</h3>
            <p>Cada licitation es procesada con IA para extraer informacion clave y resumenes ejecutivos</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Building2 size={32} />
            </div>
            <h3>Actualizacion Diaria</h3>
            <p>Nuevas licitaciones cada dia para que nunca pierdas una oportunidad de negocio</p>
          </div>
        </div>

        <div className="cta-section">
          <h2>¿Listo para encontrar tu proxima oportunidad?</h2>
          <Link to="/licitaciones" className="btn btn-primary btn-large">
            Ver Licitaciones
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </>
  )
}

// Componente para mostrar una licitacion individual
function LicitacionCard({ licitacion }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPresupuesto = (presupuesto) => {
    if (!presupuesto) return 'No especificado'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(presupuesto)
  }

  return (
    <article className="card">
      <div className="card-header">
        <h3 className="card-title">{licitacion.titulo}</h3>
        <span className={`card-badge ${licitacion.estado === 'activa' ? 'badge-active' : 'badge-closed'}`}>
          {licitacion.estado || 'activa'}
        </span>
      </div>

      <p className="card-organismo">
        <Building2 size={16} />
        {licitacion.organismo}
      </p>

      <p className="card-presupuesto">
        <Euro size={20} />
        {formatPresupuesto(licitacion.presupuesto)}
      </p>

      <p className="card-resumen">{licitacion.resumen_comercial}</p>

      {licitacion.tecnologias && licitacion.tecnologias.length > 0 && (
        <div className="card-tags">
          {licitacion.tecnologias.slice(0, 5).map((tech, index) => (
            <span key={index} className="tag">{tech}</span>
          ))}
        </div>
      )}

      <div className="card-footer">
        <span className="card-date">
          <Calendar size={14} />
          {formatDate(licitacion.fecha_publicacion)}
        </span>
        <a
          href={licitacion.url_origen}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link"
        >
          Ver original
          <ExternalLink size={16} />
        </a>
      </div>
    </article>
  )
}

// Pagina de listado de licitaciones
function Licitaciones() {
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filtros
  const [organismo, setOrganismo] = useState('')
  const [tecnologia, setTecnologia] = useState('')
  const [presupuestoMin, setPresupuestoMin] = useState('')
  const [presupuestoMax, setPresupuestoMax] = useState('')

  const fetchLicitaciones = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: 20 }
      if (organismo) params.organismo = organismo
      if (tecnologia) params.tecnologia = tecnologia
      if (presupuestoMin) params.presupuesto_min = parseFloat(presupuestoMin)
      if (presupuestoMax) params.presupuesto_max = parseFloat(presupuestoMax)

      const response = await api.get('/licitaciones', { params })
      setLicitaciones(response.data)
      // Asumimos 20 items por pagina
      setTotalPages(Math.max(1, page)) // Simplificado, se podria obtener del header
    } catch (err) {
      setError(err.message || 'Error al cargar licitaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLicitaciones()
  }, [page, organismo, tecnologia, presupuestoMin, presupuestoMax])

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLicitaciones()
  }

  const clearFilters = () => {
    setOrganismo('')
    setTecnologia('')
    setPresupuestoMin('')
    setPresupuestoMax('')
    setPage(1)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando licitaciones...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button className="btn btn-primary" onClick={fetchLicitaciones} style={{ marginTop: '1rem' }}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      <section className="hero" style={{ padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Licitaciones</h1>
        <p>Explora todas las licitaciones disponibles</p>
      </section>

      <div className="filters">
        <form onSubmit={handleFilterSubmit}>
          <div className="filters-grid">
            <div className="filter-group">
              <label><Building2 size={14} style={{ display: 'inline', marginRight: '4px' }} /> Organismo</label>
              <input
                type="text"
                placeholder="Ej: Ministerio..."
                value={organismo}
                onChange={(e) => setOrganismo(e.target.value)}
              />
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
                <option value="React">React</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MongoDB">MongoDB</option>
                <option value="Kubernetes">Kubernetes</option>
                <option value="Docker">Docker</option>
                <option value="Machine Learning">Machine Learning</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Presupuesto Min</label>
              <input
                type="number"
                placeholder="€"
                value={presupuestoMin}
                onChange={(e) => setPresupuestoMin(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Presupuesto Max</label>
              <input
                type="number"
                placeholder="€"
                value={presupuestoMax}
                onChange={(e) => setPresupuestoMax(e.target.value)}
              />
            </div>
            <div className="filter-actions">
              <button type="submit" className="btn btn-primary">
                <Search size={18} />
                Filtrar
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                <X size={18} />
                Limpiar
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="container">
        {licitaciones.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>No se encontraron licitaciones</h3>
            <p>Prueba ajustando los filtros o vuelve mas tarde</p>
          </div>
        ) : (
          <>
            <div className="licitaciones-grid">
              {licitaciones.map((licitacion) => (
                <LicitacionCard key={licitacion.id} licitacion={licitacion} />
              ))}
            </div>

            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span className="pagination-btn active">{page}</span>
              <button
                className="pagination-btn"
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// Pagina de detalle de licitacion
function LicitacionDetalle() {
  const { id } = useParams()
  const [licitacion, setLicitacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLicitacion = async () => {
      try {
        const response = await api.get(`/licitaciones/${id}`)
        setLicitacion(response.data)
      } catch (err) {
        setError(err.message || 'Error al cargar la licitacion')
      } finally {
        setLoading(false)
      }
    }
    fetchLicitacion()
  }, [id])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando detalles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (!licitacion) {
    return (
      <div className="empty-state">
        <h3>Licitacion no encontrada</h3>
      </div>
    )
  }

  const formatPresupuesto = (presupuesto) => {
    if (!presupuesto) return 'No especificado'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(presupuesto)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="detail-container">
      <Link to="/licitaciones" className="btn-back">
        <ArrowLeft size={20} />
        Volver al listado
      </Link>

      <div className="detail-card">
        <div className="detail-header">
          <h1 className="detail-title">{licitacion.titulo}</h1>
          <div className="detail-meta">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Building2 size={16} />
              {licitacion.organismo}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={16} />
              {formatDate(licitacion.fecha_publicacion)}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">Presupuesto</h2>
          <p className="detail-budget">{formatPresupuesto(licitacion.presupuesto)}</p>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">Resumen Comercial</h2>
          <p className="detail-section-content">{licitacion.resumen_comercial}</p>
        </div>

        {licitacion.tecnologias && licitacion.tecnologias.length > 0 && (
          <div className="detail-section">
            <h2 className="detail-section-title">Tecnologias</h2>
            <div className="detail-tags">
              {licitacion.tecnologias.map((tech, index) => (
                <span key={index} className="tag" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h2 className="detail-section-title">Enlaces</h2>
          <a
            href={licitacion.url_origen}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-link"
            style={{ fontSize: '1rem' }}
          >
            Ver licitacion original
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}

// Pagina de Pricing/Planes
function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const plans = [
    {
      name: 'Free',
      price: '€0',
      period: '/mes',
      description: 'Para explorar la plataforma',
      features: [
        '5 licitaciones/día',
        'Filtros básicos',
        'Búsquedas simples',
        'Soporte por email'
      ],
      cta: 'Empezar Gratis',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '€49',
      period: '/mes',
      description: 'Para empresas que buscan oportunidades activamente',
      features: [
        'Licitaciones ilimitadas',
        'Alertas email diarias',
        'Filtros avanzados',
        'Exportar a PDF/Excel',
        'API Access',
        'Soporte prioritario'
      ],
      cta: 'Suscribirse Pro',
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: '€199',
      period: '/mes',
      description: 'Para consultoras y grandes equipos',
      features: [
        'Todo lo de Pro',
        'Multi-usuario (hasta 10)',
        'Webhooks personalizados',
        'SLA garantizado',
        'Soporte dedicado 24/7',
        'White-label disponible'
      ],
      cta: 'Contactar Ventas',
      highlighted: false
    }
  ]

  const handlePlanClick = (planName) => {
    if (!user) {
      navigate('/login')
      return
    }
    // TODO: Integrar con Stripe cuando este configurado
    alert(`Plan ${planName} seleccionado. Integración con Stripe pendiente.`)
  }

  return (
    <div className="pricing-container">
      <section className="pricing-header">
        <h1>Planes y Precios</h1>
        <p>Elige el plan que mejor se adapte a tu negocio</p>
      </section>

      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
          >
            {plan.highlighted && <span className="pricing-badge">Más Popular</span>}
            <h3 className="pricing-name">{plan.name}</h3>
            <div className="pricing-price">
              <span className="price">{plan.price}</span>
              <span className="period">{plan.period}</span>
            </div>
            <p className="pricing-description">{plan.description}</p>
            <ul className="pricing-features">
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} btn-block`}
              onClick={() => handlePlanClick(plan.name)}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Seccion informativa */}
      <section style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¿Tienes dudas?</h2>
        <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
          Todos los planes incluyen acceso inmediato. Puedes cancelar cuando quieras.
          Para empresas que necesitan facturación especial o condiciones personalizadas, contacta con nuestro equipo.
        </p>
        <a href="mailto:hola@licita.ai" className="btn btn-secondary">
          Contactar soporte
        </a>
      </section>
    </div>
  )
}

// Pagina de Login
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
        <h1>Iniciar Sesión</h1>
        <p className="auth-subtitle">Accede a tu cuenta de Licita AI</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}

// Pagina de Registro
function Registro() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const result = await signUp(formData.email, formData.password, formData.nombre, formData.empresa)

    if (result.success) {
      alert('¡Cuenta creada! Revisa tu email para verificar la cuenta.')
      navigate('/login')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Crear Cuenta</h1>
        <p className="auth-subtitle">Únete a Licita AI y encuentra oportunidades de negocio</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre completo</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Juan García"
              required
            />
          </div>
          <div className="form-group">
            <label>Empresa</label>
            <input
              type="text"
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              placeholder="Tu Empresa S.L."
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@empresa.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
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
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <Router>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/licitaciones" element={<Licitaciones />} />
            <Route path="/licitacion/:id" element={<LicitacionDetalle />} />
            <Route path="/pricing" element={<Pricing />} />
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

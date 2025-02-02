const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const axios = require('axios')

const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const designRoutes = require('./routes/design')
const fileRoutes = require('./routes/file')
const informationRoutes = require('./routes/information')
const offersRoutes = require('./routes/offers')
const videoRoutes = require('./routes/video')

const app = express()

app.use(cookieParser())
const corsOptions = {
  origin: [
    'http://localhost:4200',
    'http://localhost:3000',
    'https://salon-feria-frontend.vercel.app'
  ], // Dominios permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
  credentials: true // Permitir cookies y encabezados de autenticación
}

app.use(cors(corsOptions))

// Maneja solicitudes OPTIONS automáticamente
app.options('*', cors(corsOptions))
app.use(express.json())

app.get('/proxy', async (req, res) => {
  const { url } = req.query
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    res.set('Content-Type', response.headers['content-type'])
    res.send(response.data)
  } catch (error) {
    res.status(500).send('Error al cargar la imagen')
  }
})

app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/design', designRoutes)
app.use('/file', fileRoutes)
app.use('/information', informationRoutes)
app.use('/offers', offersRoutes)
app.use('/video', videoRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

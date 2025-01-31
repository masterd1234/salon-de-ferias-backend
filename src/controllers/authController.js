/**
 * @Module authController
 */

const { db } = require('../config/firebaseConfig')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

/**
 * @route POST /auth/login
 * @description Endpoint para iniciar sesión.
 * Recibe el nombre o correo y contraseña del usuario. Retorna un token JWT (en una cookie) si las credenciales son válidas.
 *
 * @body {string} nameOrEmail - Nombre o correo electrónico del usuario.
 * @body {string} password - Contraseña del usuario.
 *
 * @response {200} - Login exitoso con un token JWT.
 * @response {401} - Usuario no encontrado o contraseña inválida.
 * @response {400} - Faltan parámetros necesarios.
 * @response {500} - Error interno del servidor.
 */

const login = async (req, res) => {
  const { nameOrEmail, password } = req.body

  if (!nameOrEmail || !password) {
    return res
      .status(400)
      .json({ message: 'Please enter both name and password' })
  }

  try {
    // Consultar la base de datos
    const [nameQuery, emailQuery] = await Promise.all([
      db.collection('users').where('name', '==', nameOrEmail).get(),
      db.collection('users').where('email', '==', nameOrEmail).get()
    ])

    // Determinar si el usuario existe
    const userDoc = !nameQuery.empty
      ? nameQuery.docs[0]
      : !emailQuery.empty
      ? emailQuery.docs[0]
      : null

    if (!userDoc) {
      return res
        .status(401)
        .json({ error: 'user_not_found', message: 'User not found' })
    }

    const user = userDoc.data()

    // Verificar contraseña

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res
        .status(401)
        .json({ error: 'invalid_password', message: 'Password invalid.' })
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        designComplete: user.design,
        information: user.information
      },
      process.env.SECRET_KEY,
      { expiresIn: '7d' }
    )

    // Configurar cookie con el token
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 604800000 // 7 días en milisegundos
    })

    // Respuesta de éxito
    return res.status(200).json({
      message: 'Login successful',
      user: { name: user.name, rol: user.rol, id: userDoc.id }
    })
  } catch (error) {
    console.error('Error in login:', error)
    return res.status(500).send({
      error: 'internal_server_error',
      message: 'Server error occurred'
    })
  }
}

/**
 * @route POST /auth/logout
 * @description Endpoint para cerrar sesión.
 * Elimina la cookie del cliente que contiene el token JWT.
 *
 * @response {200} - Cierre de sesión exitoso.
 * @response {500} - Error interno del servidor.
 */

const logout = async (req, res) => {
  try {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    })
    return res.status(200).json({ message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).send({ message: 'Error logging out' })
  }
}

const loggingForUnity = async (req, res) => {
  const { nameOrEmail, password } = req.body

  if (!nameOrEmail || !password) {
    return res
      .status(400)
      .json({ message: 'Please enter both name and password' })
  }

  try {
    // Consultar la base de datos
    const [nameQuery, emailQuery] = await Promise.all([
      db.collection('users').where('name', '==', nameOrEmail).get(),
      db.collection('users').where('email', '==', nameOrEmail).get()
    ])

    // Determinar si el usuario existe
    const userDoc = !nameQuery.empty
      ? nameQuery.docs[0]
      : !emailQuery.empty
      ? emailQuery.docs[0]
      : null

    if (!userDoc) {
      return res
        .status(401)
        .json({ error: 'user_not_found', message: 'User not found' })
    }

    const user = userDoc.data()

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res
        .status(401)
        .json({ error: 'invalid_password', message: 'Password invalid.' })
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        designComplete: user.design,
        information: user.information
      },
      process.env.SECRET_KEY,
      { expiresIn: '7d' }
    )

    // Respuesta de éxito
    return res.status(200).json({
      message: 'Login successful',
      token: token,
      user: { name: user.name, rol: user.rol }
    })
  } catch (error) {
    console.error('Error in login:', error)
    return res.status(500).send({
      error: 'internal_server_error',
      message: 'Server error occurred'
    })
  }
}

module.exports = { login, logout, loggingForUnity }

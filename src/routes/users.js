/**
 * @module usersRoutes
 *
 * Este módulo define las rutas relacionadas con los usuarios.
 * Incluye rutas para registro, obtención, actualización y eliminación de usuarios.
 */

const express = require('express')
const router = express.Router()
const usersController = require('../controllers/userController')
const {
  verifyToken,
  verifyHeaderToken
} = require('../middlewares/authMiddleware')
const multer = require('multer')

const upload = multer({ dest: 'udloads/' })

/**
 * Registra un nuevo usuario en el sistema.
 *
 * @name POST /register
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.body.name - Nombre del usuario.
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.password - Contraseña del usuario.
 * @param {string} req.body.rol - Rol del usuario ('admin', 'co', 'visitor').
 * @param {file} req.files.file - Archivo opcional (imagen o logo).
 * @param {file} req.files.cv - Archivo opcional (currículum).
 * @param {Object} res - Objeto de respuesta de Express.
 */

router.post(
  '/register',
  upload.fields([{ name: 'logo' }, { name: 'profileImagen' }, { name: 'cv' }]),
  usersController.register
)

/**
 * Actualiza los datos de un usuario específico.
 *
 * @name PUT /:id
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario a actualizar.
 * @param {string} req.body.name - Nuevo nombre del usuario (opcional).
 * @param {string} req.body.email - Nuevo correo electrónico del usuario (opcional).
 * @param {string} req.body.password - Nueva contraseña del usuario (opcional).
 * @param {string} req.body.rol - Nuevo rol del usuario (opcional).
 * @param {Object} res - Objeto de respuesta de Express.
 * @throws {Error} Si el usuario no tiene permisos para actualizar el recurso.
 */

router.put(
  '/:id',
  verifyToken,
  (req, res, next) => {
    if (req.user.id !== req.params.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }
    next() // Permite la actualización si es el mismo usuario o un administrador
  },
  usersController.updateUser
)

/**
 * Obtiene todos los usuarios con el rol "co" (empresa).
 *
 * @name GET /companies
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 */

router.get('/companies', verifyToken, usersController.getAllCompany)

/**
 * Obtiene todos los usuarios con el rol "visitor" (visitante).
 *
 * @name GET /visitors
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 */

router.get('/visitors', verifyToken, usersController.getAllVisitor)

/**
 * Obtiene todos los usuarios con el rol "admin".
 *
 * @name GET /admins
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 */

router.get('/admins', verifyToken, usersController.getAllAdmin)

/**
 * Obtiene la lista de todos los usuarios registrados en el sistema.
 *
 * @name GET /all
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 */

router.get('/all', verifyToken, usersController.getAllUsers)

/**
 * Obtiene los datos de un usuario específico por su ID.
 *
 * @name GET /:id
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario a obtener.
 * @param {Object} res - Objeto de respuesta de Express.
 */

router.get('/:id?', verifyToken, usersController.getUserById)

/**
 * Elimina un usuario específico.
 *
 * @name DELETE /:id
 * @function
 * @memberof module:usersRoutes
 * @inner
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario a eliminar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @throws {Error} Si el usuario no tiene permisos para eliminar el recurso.
 */

router.delete(
  '/:id',
  verifyToken,
  (req, res, next) => {
    if (req.user.id !== req.params.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }
    next() // Permite la actualización si es el mismo usuario o un administrador
  },
  usersController.deleterUser
)

/**
 * Ruta para obtener todas las empresas con rol "co" y sus datos relacionados desde Unity.
 *
 * Esta ruta está protegida y solo es accesible para usuarios con el rol "admin".
 * Utiliza un token enviado en el encabezado para la autenticación.
 *
 * @route GET /companies/unity
 * @group Users - Endpoints relacionados con los usuarios
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.headers.authorization - Token JWT enviado en el encabezado `Authorization`.
 * @param {Object} req.user - Información del usuario decodificada desde el token.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} 200 - JSON con los usuarios y sus datos relacionados.
 * @returns {Object} 403 - Error de acceso denegado si el usuario no es "admin".
 * @returns {Object} 500 - Error del servidor si ocurre un problema al procesar la solicitud.
 *
 * @security BearerAuth
 *
 * */

router.get(
  '/companies/unity',
  verifyToken,
  (req, res, next) => {
    // Validar que el rol del usuario sea "admin"
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: Only administrators can access this resource.'
      })
    }
    next() // Continuar con el controlador si es admin
  },
  usersController.getCompanyAll
)

router.put(
  '/users/logo/:id?',
  upload.single('logo'), // Middleware para subir un único archivo
  verifyToken,
  usersController.updateLogo
)

module.exports = router

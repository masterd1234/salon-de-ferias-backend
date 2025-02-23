/**
 * @module filesRoutes
 *
 * Este módulo define las rutas relacionadas con la gestión de archivos.
 */

const express = require('express')
const router = express.Router()
const fileController = require('../controllers/fileController') // Controlador para manejar archivos
const { verifyToken } = require('../middlewares/authMiddleware') // Middleware para verificar el token
const multer = require('multer')

// Configurar multer para manejar la subida de archivos
const upload = multer({ dest: 'uploads/' })

router.get('/company/:id?', verifyToken, fileController.getFilesById)

router.post(
  '/company/:id?',
  verifyToken,
  upload.single('file'),
  fileController.addFiles
)

/**
 * Actualizar archivos para una compañía.
 *
 * - Los administradores pueden actualizar archivos de cualquier compañía utilizando el parámetro `:id`.
 * - Las compañías solo pueden actualizar sus propios archivos.
 *
 * Middleware:
 * - `verifyToken`: Verifica que el usuario está autenticado.
 * - Verificación adicional para restringir el acceso según el rol del usuario.
 *
 * @route PUT /files/update/:id?
 * @param {string} [id] - ID opcional de la compañía (requerido solo para administradores).
 * @middleware {verifyToken} Verifica la autenticidad del usuario.
 * @middleware {multer} Maneja la subida de archivos.
 * @access Admins y usuarios con rol "co".
 *
 */
router.put(
  '/update/:id?',
  verifyToken,
  (req, res, next) => {
    // Verificar acceso según el rol del usuario
    if (req.user.rol === 'co' && req.params.id) {
      return res.status(403).json({
        error:
          'Access denied: Companies cannot modify files of other companies.'
      })
    }
    next()
  },
  upload.fields([{ name: 'banner' }, { name: 'poster' }]),
  fileController.updateFiles
)

module.exports = router

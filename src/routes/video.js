/**
 * @module VideoRoutes
 */
const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middlewares/authMiddleware');

/**
 * Ruta para agregar un video.
 * 
 * @name POST /video/add/:id?
 * @function
 * @memberof module:VideoRoutes
 * @param {string} [id] - (Opcional) ID de la empresa para los administradores.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.user - Información del usuario autenticado.
 * @param {string} req.body.url - URL del video a agregar.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con mensaje de éxito y las URLs actualizadas o la creación de un nuevo documento.
 * @throws {403} Acceso denegado si el rol es 'visitor'.
 * @throws {400} Si la URL del video ya existe en el array o no se proporciona.
 */
router.post('/add/:id?', verifyToken, (req, res, next) => {
    const { rol } = req.user;

    if (rol === 'visitor') {
        return res.status(403).json({ error: 'Access denied: Visitors cannot add videos.' });
    }
    if (rol === 'co' && req.params.id && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: Companies cannot add videos for other companies.' });
    }
    next();
}, videoController.addVideo);

/**
 * Ruta para obtener los videos de una empresa por ID.
 * 
 * @name GET /video/company/:id?
 * @function
 * @memberof module:VideoRoutes
 * @param {string} [id] - (Opcional) ID de la empresa para los administradores.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.user - Información del usuario autenticado.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con los videos asociados a la empresa.
 * @throws {403} Acceso denegado si el rol es 'visitor'.
 * @throws {404} Si no se encuentran videos para la empresa especificada.
 */
router.get('/company/:id?', verifyToken, videoController.getVideosByCompanyID);

/**
 * Ruta para eliminar una URL de video del array.
 * 
 * @name DELETE /video/delete/:id?
 * @function
 * @memberof module:VideoRoutes
 * @param {string} [id] - (Opcional) ID de la empresa para los administradores.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.user - Información del usuario autenticado.
 * @param {string} req.body.url - URL del video a eliminar.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con mensaje de éxito y la URL eliminada.
 * @throws {403} Acceso denegado si el rol es 'visitor'.
 * @throws {404} Si no se encuentra la empresa o la URL especificada.
 */
router.delete('/delete/:id?', verifyToken, (req, res, next) => {
    const { rol } = req.user;

    if (rol === 'visitor') {
        return res.status(403).json({ error: 'Access denied: Visitors cannot delete video URLs.' });
    }
    if (rol === 'co' && req.params.id && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: Companies cannot delete videos for other companies.' });
    }
    next();
}, videoController.deleteVideoUrl);

module.exports = router;

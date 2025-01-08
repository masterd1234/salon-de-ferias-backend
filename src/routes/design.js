/**
 * @module designRoutes
 * 
 * Este módulo define las rutas relacionadas con la gestión de diseños, incluyendo
 * la creación, actualización, obtención y eliminación de diseños. También incluye
 * rutas para obtener stands y modelos relacionados.
 */

const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'udloads/' });

/**
 * @route POST /addDesign/:id?
 * @description Añadir un diseño para una compañía. Los administradores pueden añadir diseños para cualquier compañía,
 * mientras que las compañías solo pueden añadir sus propios diseños. Los visitantes tienen acceso denegado.
 * @param {string} [id] - ID de la compañía (opcional para administradores).
 * @access Admin, Company
 * @middleware verifyToken
 * @middleware multer
 */
router.post('/addDesign/:id?', upload.fields([{ name: 'banner' }, { name: 'poster' }]), verifyToken, (req, res, next) => {
    if (req.user.rol === 'visitor') {
        return res.status(403).json({ error: 'Access denied: Visitors cannot add designs.' });
    }
    next();
}, designController.createDesign);

/**
 * @route GET /getDesign/:id?
 * @description Obtener un diseño específico. Los visitantes y administradores deben proporcionar un ID como parámetro.
 * @param {string} [id] - ID de la compañía (opcional para compañías).
 * @access Admin, Company, Visitor
 * @middleware verifyToken
 */
router.get('/getDesign/:id?', verifyToken, (req, res, next) => {
    const { rol } = req.user;
    if ((rol === 'visitor' || rol === 'admin') && !req.params.id) {
        return res.status(400).json({ error: 'Missing parameter: ID is required for visitors and admins.' });
    }
    next();
}, designController.getDesign);

/**
 * @route GET /allDesigns
 * @description Obtener todos los diseños disponibles. Solo accesible para administradores.
 * @access Admin
 * @middleware verifyToken
 */
router.get('/allDesigns', verifyToken, (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Only administrators can access all designs.' });
    }
    next();
}, designController.getAllDesigns);

/**
 * @route PUT /updateDesign/:id?
 * @description Actualizar un diseño existente. Las compañías solo pueden modificar sus propios diseños.
 * Los visitantes tienen acceso denegado.
 * @param {string} [id] - ID de la compañía (opcional para administradores).
 * @access Admin, Company
 * @middleware verifyToken
 * @middleware multer
 */
router.put('/updateDesign/:id?', upload.fields([{ name: 'banner' }, { name: 'poster' }]), verifyToken, async (req, res, next) => {
    try {
        if (req.user.rol === 'visitor') {
            return res.status(403).json({ error: 'Access denied: Visitors cannot modify designs.' });
        }
        next();
    } catch (error) {
        console.error('Error validating access:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}, designController.updateDesign);

/**
 * @route DELETE /deleteDesign/:id?
 * @description Eliminar un diseño existente. Las compañías solo pueden eliminar sus propios diseños.
 * Los visitantes tienen acceso denegado.
 * @param {string} [id] - ID de la compañía (opcional para administradores).
 * @access Admin, Company
 * @middleware verifyToken
 */
router.delete('/deleteDesign/:id?', verifyToken, (req, res, next) => {
    try {
        if (req.user.rol === 'visitor') {
            return res.status(403).json({ error: 'Access denied: Visitors cannot modify designs.' });
        }
        next();
    } catch (error) {
        console.error('Error validating access:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}, designController.deleterDesign);

/**
 * @route GET /stand
 * @description Obtener todos los stands disponibles.
 * @access Public
 */
router.get('/stand', designController.getAllStands);

/**
 * @route GET /model
 * @description Obtener todos los modelos disponibles.
 * @access Public
 */
router.get('/model', designController.getAllModels);

module.exports = router;

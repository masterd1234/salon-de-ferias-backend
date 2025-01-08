/**
 * @module OffersRoutes
 */
const express = require('express');
const router = express.Router();
const offersController = require('../controllers/offersController');
const { verifyToken } = require('../middlewares/authMiddleware');

/**
 * @route POST /add/:id?
 * @description Añade una nueva oferta de trabajo.
 * @access Empresas (propias) y administradores.
 * @param {string} [id] - ID de la empresa (solo administradores pueden especificarlo).
 * @middleware verifyToken - Verifica el token JWT para autenticación.
 * @middleware next - Valida el acceso según el rol del usuario.
 * @returns {Object} JSON con el mensaje de éxito y el ID de la oferta creada.
 */
router.post('/add/:id?', verifyToken, (req, res, next) => {
    const { rol } = req.user;

    if (rol === 'visitor') {
        return res.status(403).json({ error: 'Access denied: Visitors cannot add offers.' });
    }

    next();
}, offersController.addOffers);

/**
 * @route GET /company/:id?
 * @description Obtiene las ofertas de una empresa específica.
 * @access Empresas (propias) y administradores.
 * @param {string} [id] - ID de la empresa (solo administradores pueden especificarlo).
 * @middleware verifyToken - Verifica el token JWT para autenticación.
 * @middleware next - Valida el acceso según el rol del usuario.
 * @returns {Object} JSON con las ofertas de la empresa o un mensaje de error.
 */
router.get('/company/:id?', verifyToken, offersController.getOffersById);

/**
 * @route DELETE /delete/:id
 * @description Elimina una oferta de trabajo por su ID.
 * @access Empresas (propias) y administradores.
 * @param {string} id - ID de la oferta a eliminar.
 * @middleware verifyToken - Verifica el token JWT para autenticación.
 * @middleware next - Valida el acceso según el rol del usuario.
 * @returns {Object} JSON con un mensaje de éxito o error.
 */
router.delete('/delete/:id', verifyToken, (req, res, next) => {
    const { rol } = req.user;

    if (rol === 'visitor') {
        return res.status(403).json({ error: 'Access denied: Visitors cannot delete offers.' });
    }
    next();
}, offersController.deleteOfferById);

/**
 * @route PUT /update/:id
 * @description Actualiza una oferta de trabajo por su ID.
 * @access Empresas (propias) y administradores.
 * @param {string} id - ID de la oferta a actualizar.
 * @middleware verifyToken - Verifica el token JWT para autenticación.
 * @middleware next - Valida el acceso según el rol del usuario.
 * @returns {Object} JSON con un mensaje de éxito o error.
 */
router.put('/update/:id', verifyToken, (req, res, next) => {
    const { rol } = req.user;

    if (rol === 'visitor') {
        return res.status(403).json({ error: 'Access denied: Visitors cannot update offers.' });
    }

    if (rol === 'co' && req.params.id && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: Companies cannot update offers for other companies.' });
    }

    next();
}, offersController.updateOfferById);

/**
 * @route GET /all
 * @description Obtiene todas las ofertas de la colección.
 * @access Solo administradores.
 * @middleware verifyToken - Verifica el token JWT para autenticación.
 * @returns {Object} JSON con todas las ofertas o un mensaje de error.
 */
router.get('/all', verifyToken, offersController.getAllOffers);

/**
 * @route GET /search
 * @description Busca ofertas con filtros específicos.
 * @access Todos los usuarios autenticados.
 * @middleware verifyToken - Verifica el token JWT para autenticación.
 * @returns {Object} JSON con las ofertas filtradas o un mensaje de error.
 */
router.get('/search', verifyToken, offersController.searchOffers);

module.exports = router;

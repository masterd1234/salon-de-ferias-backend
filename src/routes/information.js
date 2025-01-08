const express = require('express');
const router = express.Router();
const informationController = require('../controllers/informationController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'udloads/' });

// Ruta para agregar información de la compañía
router.post(
    '/addInfo/:id?',
    upload.array('documents'), // Manejo de subida de documentos
    verifyToken,
    (req, res, next) => {
        const { rol } = req.user;

        // Verificar que visitantes no puedan realizar esta acción
        if (rol === 'visitor') {
            return res.status(403).json({ error: 'Access denied: Visitors cannot add company information.' });
        }
        next();
    },
    informationController.addInfCompany
);

// Ruta para obtener información de la compañía
router.get(
    '/getInfo/:id?',
    verifyToken,
    (req, res, next) => {
        const { rol } = req.user;

        // Verificar que visitantes pasen el parámetro `id`
        if (rol === 'visitor' && !req.params.id) {
            return res.status(400).json({ error: 'Missing parameter: ID is required for visitors.' });
        }
        next();
    },
    informationController.getInfCompany
);

// Ruta para actualizar información de la compañía
router.put(
    '/updateInfo/:id?',
    upload.array('documents'), // Manejo de subida de documentos
    verifyToken,
    (req, res, next) => {
        const { rol } = req.user;

        // Verificar que visitantes no puedan realizar esta acción
        if (rol === 'visitor') {
            return res.status(403).json({ error: 'Access denied: Visitors cannot update company information.' });
        }
        if (rol === 'co' && req.params.id && req.params.id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied: Companies can only update their own information.' });
        }
        next();
    },
    informationController.updateInfCompany
);

// Ruta para eliminar documentos de una compañía
router.put(
    '/deleteDocuments/:id?',
    verifyToken,
    (req, res, next) => {
        const { rol } = req.user;

        // Verificar que visitantes no puedan realizar esta acción
        if (rol === 'visitor') {
            return res.status(403).json({ error: 'Access denied: Visitors cannot delete company documents.' });
        }
        if (rol === 'co' && req.params.id && req.params.id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied: Companies can only delete their own documents.' });
        }
        next();
    },
    informationController.deleteDocuments
);

// Ruta para actualizar documentos de una compañía
router.put(
    '/updateDocuments/:id?',
    upload.array('documents'), // Manejo de subida de documentos
    verifyToken,
    (req, res, next) => {
        const { rol } = req.user;

        // Verificar que visitantes no puedan realizar esta acción
        if (rol === 'visitor') {
            return res.status(403).json({ error: 'Access denied: Visitors cannot update company documents.' });
        }
        if (rol === 'co' && req.params.id && req.params.id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied: Companies can only update their own documents.' });
        }
        next();
    },
    informationController.updateDocuments
);

module.exports = router;
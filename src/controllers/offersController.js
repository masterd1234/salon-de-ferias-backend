/**
 * @module OffersController
 */
const { db, admin } = require('../config/firebaseConfig');

/**
 * Agrega una nueva oferta de trabajo.
 * Incluye información de la empresa según el ID y guarda en Firestore.
 * 
 * @async
 * @function addOffers
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.user - Información del usuario.
 * @param {Object} req.body - Datos de la oferta.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con mensaje de éxito y ID de la oferta creada.
 */
const addOffers = async (req, res) => {

    const { position, workplace_type, location, job_type, sector, description, link } = req.body;
    const id = req.user.rol === 'admin' ? req.params.id : req.user.id;
    console.log('ID de la empresa para la oferta:', id);

    try {
        // Validar los campos obligatorios
        if (!position || !location || !description || !link) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        // Obtener la información de la empresa usando el ID del usuario
        const companySnapshot = await db.collection('users').doc(id).get();

        if (!companySnapshot.exists) {
            return res.status(404).json({ message: 'No se encontró información de la empresa' });
        }

        const logoSnapshot = await db.collection('logos').where('companyId', '==', id).get();
        if (logoSnapshot.empty) {
            return res.status(404).json({
                message: 'No se encontró logo de la empresa'
            });
        }
        const logoDoc = logoSnapshot.docs[0]; // Tomar el primer logo
        const logo = logoDoc
            ? {
                id: logoDoc.id,
                url: `https://backend-node-wpf9.onrender.com/proxy?url=${logoDoc.data().url}`,
            }
            : null;

        const companyData = companySnapshot.data();

        // Crear la nueva oferta con los datos obtenidos
        const newOffer = {
            position,
            workplace_type: workplace_type || null, // Valor opcional
            location,
            job_type: job_type || null, // Valor opcional
            description,
            companyID: id,
            sector: sector || null, // Valor opcional
            logo, // Logo de la empresa
            link,
            companyName: companyData.name, // Nombre de la empresa
            createdAt: admin.firestore.Timestamp.now(), // Timestamp
        };

        // Guardar la oferta en la colección "offers"
        const offersRef = await db.collection('offers').add(newOffer);

        return res.status(201).json({
            message: 'Oferta añadida con éxito',
            id: offersRef.id,
        });

    } catch (error) {
        console.error("Error al agregar oferta", error);
        return res.status(500).json({
            message: 'Error al agregar oferta',
            error: error.message,
        });
    }
};

/**
 * Obtiene las ofertas de trabajo por ID de empresa.
 * 
 * @async
 * @function getOffersById
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.user - Información del usuario.
 * @param {Object} req.body - Datos de la solicitud.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con las ofertas de la empresa.
 */
const getOffersById = async (req, res) => {
    try {
        // Determinar el ID según el rol
        const id = req.user.rol === 'admin' ? req.params.id : req.user.id;

        if (!id) {
            return res.status(400).json({ message: 'El ID es obligatorio' });
        }

        // Buscar las ofertas asociadas al ID
        const offersSnapshot = await db.collection('offers').where('companyID', '==', id).get();

        if (offersSnapshot.empty) {
            return res.status(200).json({
                message: 'No se encontraron ofertas para esta compañía',
                offers: [],
            });
        }

        // Mapear las ofertas obtenidas
        const offers = offersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json({
            message: 'Ofertas obtenidas con éxito',
            offers,
        });

    } catch (error) {
        console.error("Error al obtener ofertas:", error);
        return res.status(500).json({
            message: 'Error al obtener ofertas',
            error: error.message,
        });
    }
};


/**
 * Elimina una oferta de trabajo por ID.
 * 
 * @async
 * @function deleteOfferById
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {string} req.params.id - ID de la oferta a eliminar.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con mensaje de éxito o error.
 */
const deleteOfferById = async (req, res) => {
    try {
        const offerId = req.params.id;

        await db.collection('offers').doc(offerId).delete();

        return res.status(200).json({ message: 'Oferta eliminada con éxito' });

    } catch (error) {
        console.error("Error al eliminar oferta:", error);
        return res.status(500).json({
            message: 'Error al eliminar oferta',
            error: error.message
        });
    }
};

/**
 * Actualiza una oferta de trabajo por ID.
 * 
 * @async
 * @function updateOfferById
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {string} req.params.id - ID de la oferta a actualizar.
 * @param {Object} req.body - Datos actualizados de la oferta.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con mensaje de éxito o error.
 */
const updateOfferById = async (req, res) => {
    try {
        const offerId = req.params.id;
        const { position, workplace_type, location, job_type, sector, description } = req.body;

        const updatedData = {
            ...(position && { position }),
            ...(workplace_type && { workplace_type }),
            ...(location && { location }),
            ...(job_type && { job_type }),
            ...(description && { description }),
            ...(sector && { sector }),
            updatedAt: new Date().toISOString()
        };

        await db.collection('offers').doc(offerId).update(updatedData);

        return res.status(200).json({ message: 'Oferta actualizada con éxito' });

    } catch (error) {
        console.error("Error al actualizar oferta:", error);
        return res.status(500).json({
            message: 'Error al actualizar oferta',
            error: error.message
        });
    }
};

/**
 * Recupera todas las ofertas de la colección 'offers'.
 * 
 * @async
 * @function getAllOffers
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con las ofertas o un mensaje de error.
 */
const getAllOffers = async (req, res) => {
    try {
        // Consulta todos los documentos de la colección 'offers'
        const offersSnapshot = await db.collection('offers').get();

        // Si no hay documentos, devolver un mensaje
        if (offersSnapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron ofertas.' });
        }

        // Convertir los documentos en un arreglo de objetos
        const offers = [];
        offersSnapshot.forEach(doc => {
            offers.push({ id: doc.id, ...doc.data() });
        });

        // Responder con las ofertas
        return res.status(200).json(offers);
    } catch (error) {
        console.error('Error al recuperar las ofertas:', error);
        return res.status(500).json({ message: 'Error al recuperar las ofertas', error: error.message });
    }
};

const searchOffers = async (req, res) => {
    try {
        const {
            keyword, // palabra clave para buscar en `description` y `position`
            location,
            job_type,
            workplace_type,
            company,
            sector,
        } = req.query; // Recibir parámetros como query strings.

        let query = db.collection('offers'); // Iniciar una referencia base de la colección.

        // Agregar filtros a la consulta según los parámetros presentes.
        if (location) {
            query = query.where('location', '==', location);
        }

        if (job_type) {
            query = query.where('job_type', '==', job_type);
        }

        if (workplace_type) {
            query = query.where('workplace_type', '==', workplace_type);
        }

        if (company) {
            query = query.where('companyName', '==', company);
        }

        if (sector) {
            query = query.where('sector', '==', sector);
        }

        // Ejecutar la consulta.
        const snapshot = await query.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron ofertas.' });
        }

        let offers = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Filtrar por palabra clave en `description` y `position` (este filtrado se hace en el backend porque Firestore no soporta "OR" o búsquedas parciales directamente).
        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            offers = offers.filter((offer) =>
                offer.description.toLowerCase().includes(lowerKeyword) ||
                offer.position.toLowerCase().includes(lowerKeyword)
            );
        }

        // Enviar las ofertas filtradas.
        return res.status(200).json(offers);
    } catch (error) {
        console.error('Error al buscar ofertas:', error);
        return res.status(500).json({ message: 'Error al buscar ofertas.', error: error.message });
    }
};


module.exports = { addOffers, getOffersById, deleteOfferById, updateOfferById, getAllOffers, searchOffers };

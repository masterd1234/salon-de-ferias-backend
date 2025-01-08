/**
 * @module VideoController
 */
const { db } =  require('../config/firebaseConfig');

/**
 * Agrega un nuevo video.
 * Incluye el ID de la empresa y la URL del video.
 * 
 * @async
 * @function addVideo
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.user - Información del usuario.
 * @param {Object} req.body - Datos del video.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con mensaje de éxito y ID del video creado.
 */
const addVideo = async (req, res) => {
    
    const { url } = req.body;
    const id = req.user.rol === 'admin' ? req.params.id : req.user.id;
    
    try {

        if (!url) {
            return res.status(400).json({ message: 'La URL del video es obligatoria' });
        }

        // Buscar si ya existe un documento en la colección 'video' con el companyID
        const videoSnapshot = await db.collection('video').where('companyID', '==', id).get();

        if (!videoSnapshot.empty) {
            // Si existe un documento, obtener el primer documento
            const videoDoc = videoSnapshot.docs[0];
            const videoData = videoDoc.data();

            // Verificar si la URL ya está en el array
            if (videoData.urls.includes(url)) {
                return res.status(400).json({ message: 'El video ya existe en la lista' });
            }

            // Agregar la nueva URL al array existente
            const updatedUrls = [...videoData.urls, url];
            await db.collection('video').doc(videoDoc.id).update({ urls: updatedUrls });

            return res.status(200).json({
                message: 'Video añadido al array existente',
                id: videoDoc.id,
                urls: updatedUrls
            });
        } else {
            // Si no existe un documento, crear uno nuevo con el array de URLs
            const newVideo = {
                companyID: id,
                urls: [url]
            };

            const videoRef = await db.collection('video').add(newVideo);

            return res.status(201).json({
                message: 'Documento de video creado y video añadido',
                id: videoRef.id,
                urls: newVideo.urls
            });
        }
    } catch (error) {
        console.error("Error al agregar video", error);
        return res.status(500).json({
            message: 'Error al agregar video',
            error: error.message
        });
    }
};


/**
 * Obtiene todos los videos.
 * 
 * @async
 * @function getVideo
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON con los videos disponibles.
 */
const getVideosByCompanyID = async (req, res) => {
    try {
        // Obtener el companyID según el rol del usuario
        const companyID = req.user.rol === 'co' ? req.user.id : req.params.id;

        if (!companyID) {
            return res.status(400).json({ message: 'El companyID es obligatorio' });
        }

        // Consultar los videos con el companyID
        const videosSnapshot = await db.collection('video').where('companyID', '==', companyID).get();

        if (videosSnapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron videos para esta compañía' });
        }

        // Mapear los documentos encontrados
        const videos = videosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json(videos);
    } catch (error) {
        console.error("Error al obtener videos:", error);
        return res.status(500).json({
            message: 'Error al obtener videos',
            error: error.message,
        });
    }
};

const deleteVideoUrl = async (req, res) => {
    try {
        // Obtener el companyID según el rol del usuario
        const companyID = req.user.rol === 'co' ? req.user.id : req.params.id;
        const { url } = req.body; // URL a eliminar

        if (!companyID || !url) {
            return res.status(400).json({ message: 'El companyID y la URL son obligatorios' });
        }

        // Consultar el documento asociado al companyID
        const videoSnapshot = await db.collection('video').where('companyID', '==', companyID).get();

        if (videoSnapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron videos para esta compañía' });
        }

        // Obtener el primer documento encontrado
        const videoDoc = videoSnapshot.docs[0];
        const videoRef = db.collection('video').doc(videoDoc.id);

        // Eliminar la URL del array usando arrayRemove
        await videoRef.update({
            urls: admin.firestore.FieldValue.arrayRemove(url),
        });

        return res.status(200).json({
            message: 'URL eliminada con éxito del array de videos',
            removedUrl: url,
        });
    } catch (error) {
        console.error('Error al eliminar URL del array de videos:', error);
        return res.status(500).json({
            message: 'Error al eliminar URL del array de videos',
            error: error.message,
        });
    }
};

module.exports = { addVideo, getVideosByCompanyID, deleteVideoUrl };

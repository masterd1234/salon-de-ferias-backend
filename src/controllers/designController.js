/**
 * @module designController
 *
 * Este módulo contiene las funciones del controlador para gestionar diseños, incluyendo
 * la creación, obtención, actualización, eliminación y la obtención de modelos y stands relacionados.
 */

require('dotenv').config()
const { db, admin } = require('../config/firebaseConfig')
const jwt = require('jsonwebtoken')
const {
  uploadFileToDrive,
  getFileIdFromUrl,
  deleteFileFromDrive
} = require('../config/googleDrive')
const fs = require('fs')

const API_URL = process.env.API_URL || 'http://localhost:3000'

/**
 * @function createDesign
 * @description Crea un diseño para una compañía. Requiere los campos standID y modelID.
 * También sube archivos de banner y póster a Google Drive.
 * Actualiza el campo `design` del usuario a `true` y genera un nuevo token JWT.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Admin, Company
 */

const createDesign = async (req, res) => {
  const { standID, modelID } = req.body
  const bannerUpload = req.files?.banner ? req.files.banner[0] : null
  const posterUpload = req.files?.poster ? req.files.poster[0] : null

  // Determinar el ID según el rol del usuario
  const id = req.user.rol === 'admin' ? req.params.id : req.user.id

  // Verificar que los campos requeridos estén presentes
  if (!standID || !modelID) {
    return res
      .status(400)
      .json({ message: 'Please provide standID and modelID' })
  }

  try {
    // Verificar si ya existe un diseño para esta compañía
    const existDesign = await db
      .collection('design')
      .where('companyID', '==', id)
      .get()
    if (!existDesign.empty) {
      return res
        .status(401)
        .json({ message: 'Design already exists for this company' })
    }

    // Verificar si ya existen archivos asociados a esta compañía
    const existFile = await db
      .collection('files')
      .where('companyID', '==', id)
      .get()
    if (!existFile.empty) {
      return res
        .status(402)
        .json({ message: 'Files already exist for this company.' })
    }

    let bannerUrl = null
    let posterUrl = null

    // Subir archivo de banner a Google Drive
    if (bannerUpload) {
      const file = await uploadFileToDrive(bannerUpload, 'banners')
      bannerUrl = API_URL + '/proxy?url=' + file.webViewLink
      fs.unlink(bannerUpload.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    // Subir archivo de póster a Google Drive
    if (posterUpload) {
      const file = await uploadFileToDrive(posterUpload, 'posters')
      posterUrl = API_URL + '/proxy?url=' + file.webViewLink
      fs.unlink(posterUpload.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    // Guardar datos de archivos en Firestore
    const fileData = {
      companyID: id,
      banner: bannerUrl,
      poster: posterUrl,
      createdAt: admin.firestore.Timestamp.now()
    }

    const fileRef = await db.collection('files').add(fileData)

    // Obtener el logo del usuario asociado
    const userDocRef = db.collection('users').doc(id)
    const userSnapshot = await userDocRef.get()

    if (!userSnapshot.exists) {
      return res
        .status(404)
        .json({ message: 'User not found, cannot retrieve logo.' })
    }

    const logoSnapshot = await db
      .collection('logos')
      .where('companyId', '==', id)
      .get()
    if (logoSnapshot.empty) {
      return res.status(404).json({
        message: 'No se encontró logo de la empresa'
      })
    }
    const logoDoc = logoSnapshot.docs[0] // Tomar el primer logo
    const logo = logoDoc
      ? {
          id: logoDoc.id,
          url: `${API_URL}/proxy?url=${logoDoc.data().url}`
        }
      : null

    // Actualizar el campo `design` a `true`
    await userDocRef.update({
      design: true
    })

    // Obtener los datos actualizados del usuario después de realizar cambios
    const updatedUserSnapshot = await userDocRef.get()
    const updatedUser = updatedUserSnapshot.data()

    // Generar un nuevo token JWT con los datos actualizados
    const updatedToken = jwt.sign(
      {
        id: userDocRef.id,
        name: updatedUser.name,
        email: updatedUser.email,
        rol: updatedUser.rol,
        designComplete: updatedUser.design
      },
      process.env.SECRET_KEY,
      { expiresIn: '7d' }
    )

    // Configurar una nueva cookie con el token actualizado
    res.cookie('authToken', updatedToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 604800000
    })

    // Crear datos del diseño
    const designData = {
      companyID: id,
      standID,
      modelID,
      logo,
      fileID: fileRef.id,
      createdAt: admin.firestore.Timestamp.now()
    }

    // Guardar el diseño en Firestore
    const designRef = await db.collection('design').add(designData)

    // Respuesta exitosa
    res
      .status(200)
      .json({ message: 'Design created successfully', idDesign: designRef.id })
  } catch (error) {
    console.error('Error creating design:', error)
    res.status(500).json({ message: 'Error creating design' })
  }
}

/**
 * @function getDesign
 * @description Obtiene un diseño específico basado en el ID de la compañía. También recupera
 * información adicional sobre el stand, modelo y archivos asociados.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Admin, Company
 */

const getDesign = async (req, res) => {
  // Determinar el ID de la compañía basado en el rol
  const companyID = req.user.rol === 'visitor' ? req.params.id : req.user.id

  try {
    // Buscar el diseño asociado a la compañía
    const designSnapshot = await db
      .collection('design')
      .where('companyID', '==', companyID)
      .get()

    if (designSnapshot.empty) {
      return res
        .status(404)
        .json({ message: 'Design not found for this company.' })
    }

    // Obtener los datos del diseño
    const designData = designSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))[0]
    const { standID, modelID, fileID, createdAt, ...filtereddesignData } =
      designData
    // Obtener datos del stand relacionado
    const standSnapshot = await db
      .collection('stand')
      .doc(designData.standID)
      .get()
    if (!standSnapshot.exists) {
      console.warn(`Stand with ID ${designData.standID} not found.`)
    }
    const standData = standSnapshot?.exists
      ? (() => {
          const { uploadedAt, ...filteredData } = standSnapshot.data() // Excluir stand_config
          return {
            id: standSnapshot.id,
            ...filteredData,
            name: filteredData.url.name,
            url: `${API_URL}/proxy?url=${filteredData.url.fileUrl}`
          }
        })()
      : null

    // Obtener datos del modelo relacionado
    const modelSnapshot = await db
      .collection('model')
      .doc(designData.modelID)
      .get()
    if (!modelSnapshot.exists) {
      console.warn(`Model with ID ${designData.modelID} not found.`)
    }
    const modelData = modelSnapshot?.exists
      ? (() => {
          const { uploadedAt, ...filteredData } = modelSnapshot.data() // Puedes aplicar un filtro similar aquí si es necesario
          return {
            id: modelSnapshot.id,
            ...filteredData,

            url: `${API_URL}/proxy?url=${filteredData.url.fileUrl}`
          }
        })()
      : null

    // Obtener datos del archivo relacionado
    const fileSnapshot = await db
      .collection('files')
      .doc(designData.fileID)
      .get()
    if (!fileSnapshot.exists) {
      console.warn(`File with ID ${designData.fileID} not found.`)
    }
    const fileData = fileSnapshot.exists
      ? { id: fileSnapshot.id, ...fileSnapshot.data() }
      : null

    // Respuesta exitosa con los datos recopilados
    return res.status(200).json({
      design: filtereddesignData,
      stand: standData,
      model: modelData,
      files: fileData
    })
  } catch (error) {
    console.error('Error fetching design:', error)
    res.status(500).json({
      message: 'An error occurred while fetching the design.',
      error: error.message
    })
  }
}

/**
 * @function getAllDesigns
 * @description Obtiene todos los diseños disponibles. Incluye información detallada de los stands,
 * modelos y archivos relacionados con cada diseño.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Admin
 */

const getAllDesigns = async (req, res) => {
  try {
    // Obtener todos los diseños
    const designsSnapshot = await db.collection('design').get()

    if (designsSnapshot.empty) {
      return res.status(404).json({ message: 'No designs found' })
    }

    // Mapear todos los diseños y obtener información adicional
    const designs = await Promise.all(
      designsSnapshot.docs.map(async (doc) => {
        const designData = { id: doc.id, ...doc.data() }

        // Obtener datos del stand relacionado
        const standData = standSnapshot?.exists
          ? (() => {
              const { uploadedAt, ...filteredData } = standSnapshot.data() // Excluir stand_config
              return {
                id: standSnapshot.id,
                ...filteredData,
                name: filteredData.url.name,
                url: `${API_URL}/proxy?url=${filteredData.url.fileUrl}`
              }
            })()
          : null

        // Obtener datos del modelo relacionado
        const modelData = modelSnapshot?.exists
          ? (() => {
              const { uploadedAt, ...filteredData } = modelSnapshot.data() // Puedes aplicar un filtro similar aquí si es necesario
              return {
                id: modelSnapshot.id,
                ...filteredData,
                url: `${API_URL}/proxy?url=${filteredData.url.fileUrl}`
              }
            })()
          : null

        // Obtener datos del archivo relacionado
        const fileSnapshot = await db
          .collection('files')
          .doc(designData.fileID)
          .get()
        const fileData = fileSnapshot.exists
          ? { id: fileSnapshot.id, ...fileSnapshot.data() }
          : null

        // Combinar todos los datos en un objeto
        return {
          design: designData,
          stand: standData,
          model: modelData,
          files: fileData
        }
      })
    )

    // Respuesta exitosa con todos los diseños
    return res.status(200).json(designs)
  } catch (error) {
    console.error('Error fetching all designs:', error)
    res.status(500).json({
      message: 'An error occurred while fetching all designs.',
      error: error.message
    })
  }
}

/**
 * @function updateDesign
 * @description Actualiza un diseño existente para una compañía. Permite actualizar
 * los archivos de banner, póster y logo subiéndolos a Google Drive. Actualiza también
 * los datos del diseño en Firestore.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Admin, Company
 */

const updateDesign = async (req, res) => {
  const { standID, modelID } = req.body
  const bannerUpload = req.files?.banner ? req.files.banner[0] : null
  const posterUpload = req.files?.poster ? req.files.poster[0] : null

  const companyID = req.user.rol === 'admin' ? req.params.id : req.user.id

  try {
    // Verificar si existe un diseño para esta compañía
    const existDesignSnapshot = await db
      .collection('design')
      .where('companyID', '==', companyID)
      .get()
    if (existDesignSnapshot.empty) {
      return res
        .status(400)
        .json({ message: 'Design does not exist for this company.' })
    }

    // Verificar si existen archivos asociados a esta compañía
    const existFileSnapshot = await db
      .collection('files')
      .where('companyID', '==', companyID)
      .get()
    if (existFileSnapshot.empty) {
      return res
        .status(400)
        .json({ message: 'Files do not exist for this company.' })
    }

    const existingFile = existFileSnapshot.docs[0]
    const existingDataFile = existingFile.data()

    /* //Archivos FIREBASE
        const bucket = admin.storage().bucket();

        // Eliminar archivos existentes en Firebase Storage
        if (existingDataFile.banner) {
            const bannerPath = existingDataFile.banner.split('/').slice(-2).join('/');
            await bucket.file(bannerPath).delete().catch(err => console.warn(`Banner file not found: ${err.message}`));
        }

        if (existingDataFile.poster) {
            const posterPath = existingDataFile.poster.split('/').slice(-2).join('/');
            await bucket.file(posterPath).delete().catch(err => console.warn(`Poster file not found: ${err.message}`));
        }

        // Subir nuevos archivos a Firebase Storage
        let newBannerUrl = null;
        let newPosterUrl = null;

        if (bannerUpload) {
            const bannerFileName = `banners/${Date.now()}_${bannerUpload.originalname}`;
            const bannerFileRef = bucket.file(bannerFileName);
            await bannerFileRef.save(fs.readFileSync(bannerUpload.path), {
                contentType: bannerUpload.mimetype,
            });
            newBannerUrl = await bannerFileRef.getSignedUrl({ action: 'read', expires: '03-01-2500' });
            fs.unlink(bannerUpload.path, err => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        }

        if (posterUpload) {
            const posterFileName = `posters/${Date.now()}_${posterUpload.originalname}`;
            const posterFileRef = bucket.file(posterFileName);
            await posterFileRef.save(fs.readFileSync(posterUpload.path), {
                contentType: posterUpload.mimetype,
            });
            newPosterUrl = await posterFileRef.getSignedUrl({ action: 'read', expires: '03-01-2500' });
            fs.unlink(posterUpload.path, err => {
                if (err) console.error('Error deleting temporary file:', err);
            });

                    // Actualizar archivos en Firestore
        const updatedFileData = {
            banner: newBannerUrl ? newBannerUrl[0] : existingDataFile.banner,
            poster: newPosterUrl ? newPosterUrl[0] : existingDataFile.poster,
            updatedAt: admin.firestore.Timestamp.now(),
        };
        }*/

    //Archivos GOOGLE DRIVE
    // Eliminar archivos existentes en Google Drive
    if (existingDataFile.banner) {
      const bannerFileId = getFileIdFromUrl(existingDataFile.banner)
      await deleteFileFromDrive(bannerFileId)
    }

    if (existingDataFile.poster) {
      const posterFileId = getFileIdFromUrl(existingDataFile.poster)
      await deleteFileFromDrive(posterFileId)
    }

    let newBannerUrl = null
    let newPosterUrl = null

    // Subir nuevo archivo de banner a Google Drive
    if (bannerUpload) {
      const file = await uploadFileToDrive(bannerUpload, 'banners')
      newBannerUrl = API_URL + '/proxy?url=' + file.webViewLink
      fs.unlink(bannerUpload.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    // Subir nuevo archivo de póster a Google Drive
    if (posterUpload) {
      const file = await uploadFileToDrive(posterUpload, 'posters')
      newPosterUrl = API_URL + '/proxy?url=' + file.webViewLink
      fs.unlink(posterUpload.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    // Actualizar archivo en Firestore
    const updatedFileData = {
      banner: newBannerUrl || existingDataFile.banner,
      poster: newPosterUrl || existingDataFile.poster
    }
    await db.collection('files').doc(existingFile.id).update(updatedFileData)

    // Obtener datos del usuario
    const userDocRef = db.collection('users').doc(companyID)
    const userSnapshot = await userDocRef.get()
    if (!userSnapshot.exists) {
      return res
        .status(404)
        .json({ message: 'User not found, cannot retrieve logo.' })
    }
    const existingUserData = userSnapshot.data()

    /*  //FIREBASE
        // Eliminar logo existente en Firebase Storage
        if (existingUserData.logo) {
            const logoPath = existingUserData.logo.split('/').slice(-2).join('/');
            await bucket.file(logoPath).delete().catch(err => console.warn(`Logo file not found: ${err.message}`));
        }

        // Subir nuevo logo a Firebase Storage
        let newLogoUrl = null;
        if (logoUpload) {
            const logoFileName = `logos/${Date.now()}_${logoUpload.originalname}`;
            const logoFileRef = bucket.file(logoFileName);
            await logoFileRef.save(fs.readFileSync(logoUpload.path), {
                contentType: logoUpload.mimetype,
            });
            newLogoUrl = await logoFileRef.getSignedUrl({ action: 'read', expires: '03-01-2500' });
            fs.unlink(logoUpload.path, err => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        }

        // Actualizar logo en Firestore
        await userDocRef.update({
            logo: newLogoUrl ? newLogoUrl[0] : existingUserData.logo,
        });
        */

    // Actualizar diseño en Firestore
    const designDoc = existDesignSnapshot.docs[0]
    const updatedDesignData = {
      standID: standID || designDoc.data().standID,
      modelID: modelID || designDoc.data().modelID
    }

    await db.collection('design').doc(designDoc.id).update(updatedDesignData)

    // Respuesta exitosa
    res.status(200).json({
      message: 'Design updated successfully',
      updatedDesign: updatedDesignData
    })
  } catch (error) {
    console.error('Error updating design:', error)
    res
      .status(500)
      .json({ message: 'Error updating design', error: error.message })
  }
}

/**
 * @function deleterDesign
 * @description Elimina un diseño específico y sus archivos asociados en Firestore.
 * Verifica que el diseño y los archivos existan antes de proceder con la eliminación.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Admin, Company
 */

const deleterDesign = async (req, res) => {
  const companyID = req.user.rol === 'admin' ? req.params.id : req.user.id

  try {
    // Buscar el diseño basado en companyID
    const designSnapshot = await db
      .collection('design')
      .where('companyID', '==', companyID)
      .get()

    if (designSnapshot.empty) {
      return res.status(404).json({ message: 'Design not found' })
    }

    // Obtener el primer documento del diseño
    const designDoc = designSnapshot.docs[0]
    const designData = designDoc.data()

    // Verificar si existe el archivo asociado al diseño
    const fileRef = db.collection('files').doc(designData.fileID)
    const fileSnapshot = await fileRef.get()

    if (!fileSnapshot.exists) {
      return res.status(404).json({ message: 'File not found' })
    }

    // Eliminar el archivo en Firestore
    await fileRef.delete()

    // Eliminar el diseño en Firestore
    await db.collection('design').doc(designDoc.id).delete()

    res.status(200).json({ message: 'Design deleted successfully' })
  } catch (error) {
    console.error('Error deleting design:', error)
    res
      .status(500)
      .json({ message: 'Error deleting design', error: error.message })
  }
}

/**
 * @function getAllStands
 * @description Obtiene todos los stands disponibles en la base de datos.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Public
 */

const getAllStands = async (req, res) => {
  try {
    // Obtener todos los documentos de la colección 'stand'
    const standSnapshot = await db.collection('stand').get()

    // Verificar si la colección está vacía
    if (standSnapshot.empty) {
      return res.status(404).json({ message: 'No stands found.' })
    }

    // Mapear los documentos en un array de objetos con su ID
    const stands = standSnapshot.docs.map((doc) => ({
      id: doc.id, // ID del documento
      ...doc.data() // Datos del documento
    }))

    // Responder con los stands encontrados
    res.status(200).json(stands)
  } catch (error) {
    console.error('Error getting stands:', error)
    res
      .status(500)
      .json({ message: 'Error getting stands', error: error.message })
  }
}

/**
 * @function getAllModels
 * @description Obtiene todos los modelos disponibles en la base de datos.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @access Public
 */

const getAllModels = async (req, res) => {
  try {
    // Obtener todos los documentos de la colección 'model'
    const modelSnapshot = await db.collection('model').get()

    if (modelSnapshot.empty) {
      return res.status(404).json({ message: 'No models found.' })
    }

    const models = modelSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
    res.status(200).json(models)
  } catch (error) {
    console.error('Error getting models:', error)
    res
      .status(500)
      .json({ message: 'Error getting models', error: error.message })
  }
}

module.exports = {
  createDesign,
  getDesign,
  getAllDesigns,
  updateDesign,
  deleterDesign,
  getAllModels,
  getAllStands
}

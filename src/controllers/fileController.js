/**
 * @module fileController
 *
 * Este módulo contiene funciones relacionadas con la actualización de archivos asociados a compañías en Firestore.
 */

const { admin, db } = require('../config/firebaseConfig')
const {
  uploadFileToDrive,
  deleteFileFromDrive,
  getFileIdFromUrl
} = require('../config/googleDrive')
const fs = require('fs')

/**
 * Actualiza los archivos de banner y póster asociados a una compañía.
 *
 * - Para los usuarios con rol `admin`, el ID de la compañía se obtiene de `req.params.id`.
 * - Para otros roles, el ID se obtiene de `req.user.id`.
 *
 * La función:
 * 1. Busca los archivos existentes asociados al `companyID` en Firestore.
 * 2. Elimina los archivos actuales de Google Drive si existen.
 * 3. Sube los nuevos archivos a Google Drive.
 * 4. Actualiza el documento en Firestore con los enlaces a los nuevos archivos.
 *
 * @async
 * @function updateFiles
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.files - Archivos enviados en la solicitud (opcional).
 * @param {Array} [req.files.banner] - Archivo del banner enviado en la solicitud.
 * @param {Array} [req.files.poster] - Archivo del póster enviado en la solicitud.
 * @param {Object} req.user - Información del usuario autenticado.
 * @param {string} req.user.rol - Rol del usuario (admin o co).
 * @param {string} [req.params.id] - ID de la compañía (solo para admin).
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} Devuelve una respuesta JSON con los datos actualizados o un mensaje de error.
 *
 * @throws {Error} Si ocurre un problema al actualizar los archivos.
 *
 */
const updateFiles = async (req, res) => {
  const bannerUpload = req.files?.banner ? req.files.banner[0] : null
  const posterUpload = req.files?.poster ? req.files.poster[0] : null

  // Determinar el ID según el rol
  const id = req.user.rol === 'admin' ? req.params.id : req.user.id

  try {
    // Verificar si ya existe un documento con el mismo companyID
    const existingFileSnapshot = await db
      .collection('files')
      .where('companyID', '==', id)
      .get()

    if (existingFileSnapshot.empty) {
      return res
        .status(404)
        .json({ message: 'No existing files found for this company.' })
    }

    const existingFile = existingFileSnapshot.docs[0]
    const existingData = existingFile.data()

    // Eliminar los archivos existentes de Google Drive
    if (existingData.banner) {
      const bannerFileId = getFileIdFromUrl(existingData.banner) // Extraer el ID del archivo de la URL
      await deleteFileFromDrive(bannerFileId)
    }

    if (existingData.poster) {
      const posterFileId = getFileIdFromUrl(existingData.poster)
      await deleteFileFromDrive(posterFileId)
    }

    // Subir los nuevos archivos a Google Drive
    let newBannerUrl = null
    let newPosterUrl = null

    if (bannerUpload) {
      const file = await uploadFileToDrive(bannerUpload, 'banners')
      newBannerUrl = file.webViewLink

      // Eliminar el archivo temporal después de subirlo
      fs.unlink(bannerUpload.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    if (posterUpload) {
      const file = await uploadFileToDrive(posterUpload, 'posters')
      newPosterUrl = file.webViewLink

      // Eliminar el archivo temporal después de subirlo
      fs.unlink(posterUpload.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    // Actualizar el documento existente en Firestore
    const updatedData = {
      banner: newBannerUrl || existingData.banner, // Mantener el archivo anterior si no se sube uno nuevo
      poster: newPosterUrl || existingData.poster,
      updatedAt: admin.firestore.Timestamp.now()
    }

    await db.collection('files').doc(existingFile.id).update(updatedData)

    res.status(200).json({ message: 'Files updated successfully', updatedData })
  } catch (error) {
    console.error('Error updating files:', error)
    res.status(500).json({ message: 'Error updating files' })
  }
}

const addFiles = async (req, res) => {
  const id = req.user.rol === 'co' ? req.user.id : req.params.id
  const file = req.file
  try {
    if (!file) {
      return res.status(400).json({ message: 'No hay archivo' })
    }

    const fileResponse = await uploadFileToDrive(file, 'files')
    fileUrl = fileResponse.webViewLink

    // Buscar si ya existe un documento en la colección 'archivo' con el companyID
    const fileSnapshot = await db
      .collection('download-files')
      .where('companyId', '==', id)
      .get()

    if (!fileSnapshot.empty) {
      // Si existe un documento, obtener el primer documento
      const fileDoc = fileSnapshot.docs[0]
      const fileData = fileDoc.data()

      // Verificar si la URL ya está en el array
      if (fileData.urls.includes(fileUrl)) {
        return res
          .status(400)
          .json({ message: 'El archivo ya existe en la lista' })
      }

      // Agregar la nueva URL al array existente
      const updatedUrls = [...fileData.urls, fileUrl]
      await db
        .collection('download-files')
        .doc(fileDoc.id)
        .update({ urls: updatedUrls })

      return res.status(200).json({
        message: 'Archivo añadido al array existente',
        id: fileDoc.id,
        urls: updatedUrls
      })
    } else {
      // Si no existe un documento, crear uno nuevo con el array de URLs
      const newFile = {
        companyId: id,
        urls: [fileUrl]
      }

      const fileRef = await db.collection('download-files').add(newFile)

      return res.status(201).json({
        message: 'Documento de archivo creado y archivo añadido',
        id: fileRef.id,
        urls: newFile.urls
      })
    }
  } catch (error) {
    console.error('Error al agregar archivo', error)
    return res.status(500).json({
      message: 'Error al agregar archivo',
      error: error.message
    })
  }
}

const getFilesById = async (req, res) => {
  try {
    // Obtener el companyID según el rol del usuario
    const companyID = req.user.rol === 'co' ? req.user.id : req.params.id

    if (!companyID) {
      return res.status(400).json({ message: 'El companyID es obligatorio' })
    }

    // Consultar los archivos con el companyID
    const filesSnapshot = await db
      .collection('download-files')
      .where('companyId', '==', companyID)
      .get()

    if (filesSnapshot.empty) {
      return res
        .status(404)
        .json({ message: 'No se encontraron archivos para esta compañía' })
    }

    // Mapear los documentos encontrados
    const files = filesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    return res.status(200).json(files)
  } catch (error) {
    console.error('Error al obtener archivos:', error)
    return res.status(500).json({
      message: 'Error al obtener archivos',
      error: error.message
    })
  }
}

module.exports = { updateFiles, addFiles, getFilesById }

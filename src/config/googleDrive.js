const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

// Configurar autenticación con Google Drive
const auth = new google.auth.GoogleAuth({
  keyFile: '/etc/secrets/credentialsDrive.json', // Ruta al archivo JSON de credenciales
  scopes: ['https://www.googleapis.com/auth/drive']
})

const drive = google.drive({ version: 'v3', auth })

const getOrCreateFolder = async (folderName) => {
  try {
    // Buscar la carpeta por nombre
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    })

    if (response.data.files.length > 0) {
      // La carpeta ya existe, devolvemos su ID
      console.log(
        `Carpeta encontrada: ${response.data.files[0].name} (ID: ${response.data.files[0].id})`
      )
      return response.data.files[0].id
    }

    // Si no existe, creamos la carpeta
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    }

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    })

    console.log(`Carpeta creada: ${folderName} (ID: ${folder.data.id})`)
    return folder.data.id
  } catch (error) {
    console.error('Error al comprobar o crear la carpeta:', error.message)
    throw new Error('Failed to get or create folder in Google Drive')
  }
}

// Función para subir archivo a Google Drive
const uploadFileToDrive = async (file, folderName) => {
  try {
    const folderId = await getOrCreateFolder(folderName)

    const fileMetadata = {
      name: file.originalname,
      parents: [folderId]
    }

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path)
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id' // Solo necesitamos el ID del archivo
    })

    const fileId = response.data.id

    // Configurar permisos públicos para el archivo subido
    await setPublicPermissions(fileId)

    console.log(`Archivo subido: ${file.originalname} (ID: ${fileId})`)

    // Construir la URL personalizada
    const customUrl = `https://drive.google.com/uc?id=${fileId}`

    return {
      fileId,
      webViewLink: customUrl // Devolver siempre la URL personalizada
    }
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error.message)
    throw new Error('Failed to upload file to Google Drive')
  }
}

// Configurar permisos públicos para el archivo subido
const setPublicPermissions = async (fileId) => {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader', // Permiso de solo lectura
        type: 'anyone' // Acceso para cualquiera con el enlace
      }
    })
    console.log(`Public permissions set for file: ${fileId}`)
  } catch (error) {
    console.error('Error setting public permissions:', error.message)
    throw new Error('Failed to set public permissions')
  }
}

/**
 * Elimina un archivo de Google Drive.
 *
 * @param {string} fileId - ID del archivo a eliminar en Google Drive.
 */
const deleteFileFromDrive = async (fileId) => {
  try {
    await drive.files.delete({
      fileId: fileId
    })
    console.log(`File ${fileId} deleted successfully`)
  } catch (error) {
    console.error('Error deleting file from Google Drive:', error)
    throw new Error('Failed to delete file from Google Drive')
  }
}

/**
 * Extrae el ID de un archivo desde su URL de Google Drive.
 *
 * @param {string} url - URL del archivo en Google Drive.
 * @returns {string|null} - ID del archivo si se encuentra, de lo contrario null.
 */
const getFileIdFromUrl = (url) => {
  const regex = /\/d\/(.+?)\//
  const match = url.match(regex)
  return match ? match[1] : null
}

module.exports = { uploadFileToDrive, deleteFileFromDrive, getFileIdFromUrl }

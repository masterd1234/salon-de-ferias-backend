/**
 *
 * @module informationController
 * Controlador de la informacion de la empresa.
 * Define la lógica para manejar las solicitudes relacionadas la informacion de la empresa.
 */

const { db, admin } = require('../config/firebaseConfig')
const jwt = require('jsonwebtoken')
const {
  uploadFileToDrive,
  getFileIdFromUrl,
  deleteFileFromDrive
} = require('../config/googleDrive')
const fs = require('fs')

/**
 * Adds information for a company.
 *
 * @param {object} req - Express request object.
 * @param {object} req.body - Request body containing company information.
 * @param {string} req.body.description - The company's description (required).
 * @param {string} [req.body.additional_information] - Additional information about the company.
 * @param {Array} [req.body.links] - Array of links, each with `aditionalButtonTitle` and `additionalButtonLink`.
 * @param {string} [req.body.sector] - The sector in which the company operates.
 * @param {object} req.user - Decoded user data from token.
 * @param {string} req.user.id - User ID.
 * @param {string} req.user.rol - User role (e.g., `admin`, `co`).
 * @param {Array} [req.files.documents] - Array of uploaded documents.
 * @param {object} res - Express response object.
 */

const addInfCompany = async (req, res) => {
  const { description, additional_information, links, sector } = req.body
  const documentsUpload = req.files?.documents || []

  const companyID = req.user.rol === 'admin' ? req.params.id : req.user.id

  try {
    if (!description) {
      return res.status(400).json({ message: 'Description is required' })
    }

    const validLinks =
      links &&
      links.every(
        (link) => link.additionalButtonTitle && link.additionalButtonLink
      )
    if (!validLinks) {
      return res.status(400).json({
        message: 'Links must have aditionalButtonTitle and additionalButtonLink'
      })
    }

    /* //FIREBASE
                let uploadedDocuments = [];
        const bucket = admin.storage().bucket();

        // Procesar cada documento cargado
        for (const document of documentsUpload) {
            const filePath = `company_documents/${companyID}/${Date.now()}_${document.originalname}`;
            const fileRef = bucket.file(filePath);

            // Subir el archivo a Firebase Storage
            await fileRef.save(fs.readFileSync(document.path), {
                contentType: document.mimetype,
            });

            // Obtener la URL de acceso al archivo
            const signedUrl = await fileRef.getSignedUrl({
                action: 'read',
                expires: '03-01-2500', // Fecha de expiración de la URL
            });

            // Agregar detalles del documento al array
            uploadedDocuments.push({
                fileName: document.originalname,
                url: signedUrl[0], // Firebase devuelve un array con la URL
            });

            // Eliminar el archivo temporal después de subirlo
            fs.unlink(document.path, (err) => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        }*/

    let uploadedDocuments = []

    for (const document of documentsUpload) {
      const file = await uploadFileToDrive(document.path, 'company_documents')
      uploadedDocuments.push({
        fileName: document.originalName,
        url: file.webViewLink
      })

      fs.unlink(document.path, (err) => {
        if (err) console.error('Error deleting temporary file: ', err)
      })
    }

    const userDocRef = db.collection('users').doc(companyID)
    await userDocRef.update({
      information: true
    })

    // Obtener los datos actualizados del usuario después de realizar cambios
    const updatedUserSnapshot = await userDocRef.get()
    const updatedUser = updatedUserSnapshot.data()

    const updatedToken = jwt.sign(
      {
        id: userDocRef.id,
        name: updatedUser.name,
        email: updatedUser.email,
        rol: updatedUser.rol,
        designComplete: updatedUser.design,
        information: updatedUser.information
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

    const newInfCompany = {
      description,
      additional_information: additional_information || '',
      companyID,
      links: links || [],
      documents: uploadedDocuments || [],
      sector
    }

    const companyRef = await db.collection('company').add(newInfCompany)
    return res.status(201).json({
      message: 'Information company added successfully',
      id: companyRef.id
    })
  } catch (error) {
    console.error('Error adding information company: ', error)
    return res.status(500).json({ message: 'Error adding information company' })
  }
}

/**
 * Retrieves information for a company.
 *
 * @param {object} req - Express request object.
 * @param {object} req.user - Decoded user data from token.
 * @param {string} req.user.id - User ID.
 * @param {string} req.user.rol - User role (e.g., `admin`, `co`).
 * @param {string} [req.params.id] - ID of the company (required for `admin`).
 * @param {object} res - Express response object.
 */

const getInfCompany = async (req, res) => {
  const companyID = req.user.rol === 'co' ? req.user.id : req.params.id

  try {
    if (!companyID) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    // Realizar la consulta con `where`
    const companySnapshot = await db
      .collection('company')
      .where('companyID', '==', companyID)
      .get()

    // Verificar si hay documentos en el snapshot
    if (companySnapshot.empty) {
      return res.status(404).json({ message: 'Company not found' })
    }

    // Extraer los datos del primer documento encontrado
    const companyData = companySnapshot.docs[0].data()

    return res.status(200).json(companyData)
  } catch (error) {
    console.error('Error getting information company: ', error)
    return res
      .status(500)
      .json({ message: 'Error getting information company' })
  }
}

const addLinksCalendar = async (req, res) => {
  const { link_event, name_date, description } = req.body

  const companyID = req.params.id

  try {
    if (!name_date || !link_event || !description) {
      return res
        .status(400)
        .json({ success: false, message: 'Todos los campos son obligatorios' })
    }

    const companyRef = db.collection('company-links-events').doc(companyID)
    const companyDoc = await companyRef.get()

    const newEvent = { name_date, link_event, description }

    if (companyDoc.exists) {
      // Si la empresa ya tiene eventos, actualiza el array
      await companyRef.update({
        links_event: [...companyDoc.data().links_event, newEvent]
      })
    } else {
      // Si no existe, crea el documento con el array de eventos
      await companyRef.set({
        companyID,
        links_event: [newEvent]
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Evento guardado correctamente'
    })
  } catch (error) {
    console.error('Error al guardar el evento:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al guardar el evento',
      error: error.message
    })
  }
}

const getLinksCalendar = async (req, res) => {
  const companyID = req.user.id ? req.user.id : req.params.id
  try {
    // Verificar que companyID no esté vacío
    if (!companyID) {
      return res.status(400).json({
        success: false,
        message: 'El companyID es obligatorio'
      })
    }

    const companyRef = db.collection('company-links-events').doc(companyID)
    const companyDoc = await companyRef.get()

    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron eventos para esta compañía'
      })
    }

    // Extraer eventos
    const data = companyDoc.data()
    return res.status(200).json({
      success: true,
      message: 'Eventos obtenidos con éxito',
      events: data.links_event || []
    })
  } catch (error) {
    console.error('Error al obtener eventos:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al obtener eventos',
      error: error.message
    })
  }
}

/**
 * Updates information for a company.
 *
 * @param {object} req - Express request object.
 * @param {object} req.body - Request body containing updated company information.
 * @param {string} [req.body.description] - Updated company description.
 * @param {string} [req.body.additional_information] - Updated additional information.
 * @param {Array} [req.body.links] - Updated array of links with `additionalButtonTitle` and `additionalButtonLink`.
 * @param {string} [req.body.sector] - Updated sector for the company.
 * @param {object} req.user - Decoded user data from token.
 * @param {string} req.user.id - User ID.
 * @param {string} req.user.rol - User role (e.g., `admin`, `co`).
 * @param {string} [req.params.id] - ID of the company (required for `admin`).
 * @param {object} res - Express response object.
 */

const updateInfCompany = async (req, res) => {
  const companyID = req.user.rol === 'admin' ? req.params.id : req.user.id
  const { description, additional_information, links, sector } = req.body

  try {
    // Validar los enlaces, si se proporcionan
    if (
      links &&
      !links.every(
        (link) => link.additionalButtonTitle && link.additionalButtonLink
      )
    ) {
      return res.status(400).json({
        message:
          'Links must have additionalButtonTitle and additionalButtonLink'
      })
    }

    // Buscar el documento de la compañía por companyID
    const companySnapshot = await db
      .collection('company')
      .where('companyID', '==', companyID)
      .get()

    if (companySnapshot.empty) {
      return res.status(404).json({ message: 'Company not found' })
    }

    // Obtén el primer documento encontrado
    const companyDoc = companySnapshot.docs[0]

    // Crear los datos actualizados
    const updatedData = {
      description,
      additional_information: additional_information || '',
      links: links || [],
      sector: sector || null,
      updatedAt: admin.firestore.Timestamp.now()
    }

    // Actualizar la información de la compañía
    await companyDoc.ref.update(updatedData)

    // Responder con éxito
    res.status(200).json({
      message: 'Company information updated successfully',
      updatedData
    })
  } catch (error) {
    console.error('Error updating company information:', error)
    res.status(500).json({
      message: 'Error updating company information',
      error: error.message
    })
  }
}

/**
 * Deletes specific documents from a company while keeping the specified ones.
 *
 * @param {object} req - Express request object.
 * @param {object} req.body - Request body containing the documents to keep.
 * @param {Array} req.body.documentsToKeep - Array of document objects with `fileName` to keep.
 * @param {object} req.user - Decoded user data from token.
 * @param {string} req.user.id - User ID.
 * @param {string} req.user.rol - User role (e.g., `admin`, `co`).
 * @param {string} [req.params.id] - ID of the company (required for `admin`).
 * @param {object} res - Express response object.
 */

const deleteDocuments = async (req, res) => {
  // Determinar el companyID según el rol del usuario
  const companyID = req.user.rol === 'admin' ? req.params.id : req.user.id

  const { documentsToKeep } = req.body // Array con los documentos que se deben conservar

  if (!documentsToKeep || !Array.isArray(documentsToKeep)) {
    return res
      .status(400)
      .json({ message: 'documentsToKeep array is required' })
  }

  try {
    // Obtener la referencia de la compañía en Firestore
    const companyRef = db.collection('company').doc(companyID)
    const companySnapshot = await companyRef.get()

    if (!companySnapshot.exists) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' })
    }

    // Obtener los documentos actuales
    const companyData = companySnapshot.data()
    const existingDocuments = companyData.documents || []

    /* //FIREBASE
                const bucket = admin.storage().bucket();

        // Identificar los documentos a eliminar
        const documentsToDelete = existingDocuments.filter(
            (doc) => !documentsToKeep.some((keepDoc) => keepDoc.fileName === doc.fileName)
        );

        // Eliminar los documentos de Firebase Storage
        for (const doc of documentsToDelete) {
            const filePath = doc.url.split('/').slice(-2).join('/'); // Extraer la ruta del archivo desde la URL
            await bucket.file(filePath).delete().catch((err) => {
                console.error(`Failed to delete document ${doc.fileName} from Firebase Storage:`, err);
            });
        } */

    // Identificar los documentos a eliminar
    const documentsToDelete = existingDocuments.filter(
      (doc) =>
        !documentsToKeep.some((keepDoc) => keepDoc.fileName === doc.fileName)
    )

    // Eliminar los documentos de Google Drive
    for (const doc of documentsToDelete) {
      const fileId = getFileIdFromUrl(doc.url) // Obtener el ID del archivo de la URL
      await deleteFileFromDrive(fileId).catch((err) => {
        console.error(
          `Failed to delete document ${doc.fileName} from Google Drive:`,
          err
        )
      })
    }

    // Actualizar Firestore conservando solo los documentos especificados
    await companyRef.update({
      documents: documentsToKeep,
      updatedAt: admin.firestore.Timestamp.now()
    })

    return res.status(200).json({
      success: true,
      message:
        'Documents updated successfully. Unnecessary documents deleted from Google Drive.',
      updatedDocuments: documentsToKeep
    })
  } catch (error) {
    console.error('Error deleting documents and updating Firestore:', error)
    return res.status(500).json({
      success: false,
      message: 'Error deleting documents and updating Firestore',
      error: error.message
    })
  }
}

/**
 * Updates documents for a company by adding new ones and removing those not in the new list.
 *
 * @param {object} req - Express request object.
 * @param {object} req.body - Request body containing new documents and metadata.
 * @param {Array} req.body.newDocuments - Array of document objects to keep or update.
 * @param {object} req.user - Decoded user data from token.
 * @param {string} req.user.id - User ID.
 * @param {string} req.user.rol - User role (e.g., `admin`, `co`).
 * @param {string} [req.params.id] - ID of the company (required for `admin`).
 * @param {Array} [req.files.documents] - Array of newly uploaded documents.
 * @param {object} res - Express response object.
 */

const updateDocuments = async (req, res) => {
  // Determinar el companyID según el rol del usuario
  const companyID = req.user.rol === 'admin' ? req.params.id : req.user.id

  const { newDocuments } = req.body // Nuevos documentos proporcionados en el cuerpo de la solicitud

  if (!newDocuments || !Array.isArray(newDocuments)) {
    return res.status(400).json({ message: 'New documents array is required' })
  }

  try {
    // Obtener la referencia de la compañía en Firebase
    const companyRef = db.collection('company').doc(companyID)
    const companySnapshot = await companyRef.get()

    if (!companySnapshot.exists) {
      return res.status(404).json({ message: 'Company not found' })
    }

    // Obtener los documentos actuales
    const companyData = companySnapshot.data()
    const existingDocuments = companyData.documents || []

    /*        
        //FIREBASE
        // Identificar documentos a eliminar (los que no están en newDocuments)
        const documentsToDelete = existingDocuments.filter(
            (doc) => !newDocuments.some((newDoc) => newDoc.fileName === doc.fileName)
        );

        const bucket = admin.storage().bucket();

        // Eliminar documentos de Firebase Storage
        for (const doc of documentsToDelete) {
            const filePath = doc.url.split('/').slice(-2).join('/'); // Extraer la ruta del archivo desde la URL
            await bucket.file(filePath).delete().catch((err) => {
                console.error(`Failed to delete document ${doc.fileName} from Firebase Storage:`, err);
            });
        }

        // Subir nuevos documentos a Firebase Storage
        const uploadedDocuments = [];
        for (const document of req.files?.documents || []) {
            const fileName = `company_documents/${Date.now()}_${document.originalname}`;
            const fileRef = bucket.file(fileName);

            await fileRef.save(document.buffer, {
                contentType: document.mimetype,
            });

            const signedUrl = await fileRef.getSignedUrl({
                action: 'read',
                expires: '03-01-2500',
            });

            uploadedDocuments.push({
                fileName: document.originalname,
                url: signedUrl[0], // Firebase devuelve un array con la URL
            });

            // Eliminar archivo temporal
            fs.unlink(document.path, (err) => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        }*/

    // Identificar documentos a eliminar (los que no están en newDocuments)
    const documentsToDelete = existingDocuments.filter(
      (doc) => !newDocuments.some((newDoc) => newDoc.fileName === doc.fileName)
    )

    // Eliminar documentos de Google Drive
    for (const doc of documentsToDelete) {
      const fileId = getFileIdFromUrl(doc.url)
      await deleteFileFromDrive(fileId).catch((err) => {
        console.error(`Failed to delete document ${doc.fileName}:`, err)
      })
    }

    // Subir nuevos documentos a Google Drive
    const uploadedDocuments = []
    for (const document of req.files?.documents || []) {
      const file = await uploadFileToDrive(document, 'company_documents')
      uploadedDocuments.push({
        fileName: document.originalname,
        url: file.webViewLink
      })

      // Eliminar archivo temporal
      fs.unlink(document.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err)
      })
    }

    // Combinar documentos existentes y nuevos
    const updatedDocuments = [
      ...newDocuments.filter((doc) =>
        existingDocuments.some((existDoc) => existDoc.fileName === doc.fileName)
      ),
      ...uploadedDocuments
    ]

    // Actualizar los documentos en Firebase
    await companyRef.update({
      documents: updatedDocuments,
      updatedAt: admin.firestore.Timestamp.now()
    })

    return res.status(200).json({
      message: 'Documents updated successfully',
      updatedDocuments
    })
  } catch (error) {
    console.error('Error updating documents:', error)
    return res
      .status(500)
      .json({ message: 'Error updating documents', error: error.message })
  }
}

module.exports = {
  addInfCompany,
  getInfCompany,
  updateInfCompany,
  updateDocuments,
  deleteDocuments,
  addLinksCalendar,
  getLinksCalendar
}

/**
 *
 * @module userController
 * Controlador de usuarios.
 * Define la lógica para manejar las solicitudes relacionadas con los usuarios.
 */

const { admin, db } = require('../config/firebaseConfig')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
  uploadFileToDrive,
  deleteFileFromDrive
} = require('../config/googleDrive')
const fs = require('fs')

/**
 * Registra un nuevo usuario en el sistema.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.body.name - Nombre del usuario.
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.password - Contraseña del usuario.
 * @param {string} req.body.rol - Rol del usuario ('admin', 'co', 'visitor').
 * @param {file} req.files.file - Archivo opcional (imagen o logo).
 * @param {file} req.files.cv - Archivo opcional (currículum).
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con mensaje y ID del usuario registrado.
 */

const register = async (req, res) => {
  const { name, email, password, rol, phone, subname, studies, cif, dni } =
    req.body
  const logoUpload = req.files?.logo ? req.files.logo[0] : null // Asegúrate de que req.files.file[0] exista
  const profileImagenUpload = req.files?.profileImagen
    ? req.files.profileImagen[0]
    : null // Aseg
  const cvUpload = req.files?.cv ? req.files.cv[0] : null
  console.log('req.files:', req.files)
  if (!name || !email || !password || !rol) {
    return res
      .status(400)
      .json({ error: 'invalid_request', message: 'Invalid request.' })
  }

  const permitionRol = ['admin', 'co', 'visitor']
  if (!permitionRol.includes(rol)) {
    return res
      .status(400)
      .json({ error: 'invalid_rol', message: 'Invalid rol' })
  }

  try {
    const [usersEmailSnapshot, usersNameSnapshot] = await Promise.all([
      db.collection('users').where('email', '==', email).get(),
      db.collection('users').where('name', '==', name).get()
    ])

    if (!usersEmailSnapshot.empty) {
      return res
        .status(400)
        .json({ error: 'invalid_email', message: 'Email already exists.' })
    }

    if (!usersNameSnapshot.empty) {
      return res
        .status(400)
        .json({ error: 'invalid_name', message: 'Name already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    /*
        // Subir la imagen y el documento a Firebase Storage
        if (fileUpload) {
            try {
                const fileRef = bucket.file(`profile_images/${Date.now()}_${fileUpload.name}`);
                await fileRef.save(fileUpload.data, { contentType: fileUpload.mimetype });
                const signedUrl = await fileRef.getSignedUrl({ action: 'read', expires: '03-01-2500' }); // URL pública
                fileUrl = signedUrl[0];

                // Limpia el archivo temporal después de subirlo
                fs.unlink(fileUpload.path, (err) => {
                    if (err) console.error('Error eliminando archivo temporal:', err);
                });
            } catch (error) {
                console.error('Error subiendo archivo a Firebase:', error);
            }
        }

        if (cvUpload) {
            try {
                const cvRef = bucket.file(`cv_files/${Date.now()}_${cvUpload.name}`);
                await cvRef.save(cvUpload.data, { contentType: cvUpload.mimetype });
                const signedUrl = await cvRef.getSignedUrl({ action: 'read', expires: '03-01-2500' }); // URL pública
                cvUrl = signedUrl[0];

                // Limpia el archivo temporal después de subirlo
                fs.unlink(cvUpload.path, (err) => {
                    if (err) console.error('Error eliminando archivo temporal:', err);
                });
            } catch (error) {
                console.error('Error subiendo CV a Firebase:', error);
            }
        }*/

    // Subir archivos a Google Drive
    let profileImagenUrl = null
    let logoUrl = null
    let cvUrl = null
    let logoId = null

    if (logoUpload) {
      const fileResponse = await uploadFileToDrive(logoUpload, 'logos')
      logoUrl = fileResponse.webViewLink

      // Crear un documento en la colección 'logos'
      const logoDoc = await db.collection('logos').add({
        companyId: null, // Se actualizará después
        url: logoUrl,
        uploadedAt: admin.firestore.Timestamp.now()
      })

      logoId = logoDoc.id

      // Limpia el archivo temporal
      fs.unlink(logoUpload.path, (err) => {
        if (err) console.error('Error eliminando archivo temporal:', err)
      })
    }

    if (profileImagenUpload) {
      const fileResponse = await uploadFileToDrive(
        profileImagenUpload,
        'profileImages'
      )
      profileImagenUrl = fileResponse.webViewLink

      // Limpia el archivo temporal después de subirlo
      fs.unlink(profileImagenUpload.path, (err) => {
        if (err) console.error('Error eliminando archivo temporal:', err)
      })
    }

    if (cvUpload) {
      const cvResponse = await uploadFileToDrive(cvUpload, 'cvFiles')
      cvUrl = cvResponse.webViewLink

      // Limpia el archivo temporal después de subirlo
      fs.unlink(cvUpload.path, (err) => {
        if (err) console.error('Error eliminando archivo temporal:', err)
      })
    }

    // Preparar datos del usuario
    const userData = {
      name,
      email,
      rol,
      password: hashedPassword,
      createdAt: admin.firestore.Timestamp.now(),
      ...(rol === 'co' && {
        cif,
        logo: logoId,
        design: false,
        information: false
      }),
      ...(rol === 'visitor' && {
        dni,
        subname,
        logo: logoId,
        studies,
        image: profileImagenUrl,
        cv: cvUrl,
        phone
      })
    }

    // Crear el usuario
    const userRef = await db.collection('users').add(userData)

    // Si se subió un logo, actualizar el documento del logo con el ID del usuario
    if (logoId) {
      await db.collection('logos').doc(logoId).update({ companyId: userRef.id })
    }

    res.status(201).json({ message: 'User created successfully', userData })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

/**
 * Obtiene todos los usuarios con el rol "co" (empresa).
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con una lista de empresas.
 */

const getAllCompany = async (req, res) => {
  try {
    // Consultar usuarios con rol "co"
    const companyDoc = await db
      .collection('users')
      .where('rol', '==', 'co')
      .get()

    if (companyDoc.empty) {
      return res.status(404).json({ message: 'No companies found' })
    }

    // Mapear los datos de las empresas y obtener sus logos
    const companies = await Promise.all(
      companyDoc.docs.map(async (doc) => {
        const data = doc.data()
        const { password, createdAt, rol, logo: logoId, ...filteredData } = data // Excluir contraseña
        let logoUrl = null

        // Si la empresa tiene un logoId, buscar la URL en la colección 'logos'
        if (logoId) {
          const logoSnapshot = await db
            .collection('logos')
            .where('companyId', '==', doc.id)
            .get()

          if (!logoSnapshot.empty) {
            const logoDoc = logoSnapshot.docs[0] // Tomar el primer documento encontrado
            const logoData = logoDoc.data()
            logoUrl =
              'https://backend-node-wpf9.onrender.com/proxy?url=' + logoData.url // Extraer la URL del logo
          }
        }

        return {
          id: doc.id, // Incluye el ID del documento
          ...filteredData,
          logo: logoUrl // Devuelve la URL del logo
        }
      })
    )

    res.status(200).json({ companies })
  } catch (error) {
    console.error('Error al obtener empresas:', error)
    res.status(500).json({ error: 'Failed to get companies' })
  }
}

/**
 * Obtiene todos los usuarios con el rol "visitor" (visitante).
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con una lista de visitantes.
 */

const getAllVisitor = async (req, res) => {
  try {
    // Consultar usuarios con rol "visitor"
    const visitorDoc = await db
      .collection('users')
      .where('rol', '==', 'visitor')
      .get()

    if (visitorDoc.empty) {
      return res.status(404).json({ message: 'No visitors found' })
    }

    // Mapear los datos de los visitantes
    const visitors = visitorDoc.docs.map((doc) => {
      const data = doc.data()
      const { password, createdAt, rol, ...filteredData } = data // Excluir contraseña, createdAt y rol
      return {
        id: doc.id, // Incluye el ID del documento
        ...filteredData
      }
    })

    res.status(200).json({ visitors })
  } catch (error) {
    console.error('Error fetching visitors:', error)
    res.status(500).json({ error: 'Failed to get visitors' })
  }
}

/**
 * Obtiene todos los usuarios con el rol "admin".
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con una lista de administradores.
 */

const getAllAdmin = async (req, res) => {
  try {
    // Consultar usuarios con rol "admin"
    const adminDoc = await db
      .collection('users')
      .where('rol', '==', 'admin')
      .get()

    if (adminDoc.empty) {
      return res.status(404).json({ message: 'No admins found' })
    }

    // Mapear los datos de los administradores
    const admins = adminDoc.docs.map((doc) => {
      const data = doc.data()
      const { password, createdAt, rol, ...filteredData } = data // Excluir contraseña, createdAt y rol
      return {
        id: doc.id, // Incluye el ID del documento
        ...filteredData
      }
    })

    res.status(200).json({ admins })
  } catch (error) {
    console.error('Error fetching admins:', error)
    res.status(500).json({ error: 'Failed to get admins' })
  }
}

/**
 * Obtiene todos los usuarios registrados en el sistema.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con una lista de usuarios.
 */

const getAllUsers = async (req, res) => {
  try {
    // Consultar usuarios
    const userDoc = await db.collection('users').get()

    if (userDoc.empty) {
      return res.status(404).json({ message: 'No users found' })
    }

    // Mapear los datos
    const users = await Promise.all(
      userDoc.docs.map(async (doc) => {
        const data = doc.data()
        const { password, createdAt, logo: logoId, ...filteredData } = data // Excluir campos sensibles
        let logoUrl = null

        // Si la empresa tiene un logoId, buscar la URL en la colección 'logos'
        if (logoId) {
          const logoSnapshot = await db
            .collection('logos')
            .where('companyId', '==', doc.id)
            .get()

          if (!logoSnapshot.empty) {
            const logoDoc = logoSnapshot.docs[0] // Tomar el primer documento encontrado
            const logoData = logoDoc.data()
            logoUrl =
              'https://backend-node-wpf9.onrender.com/proxy?url=' + logoData.url // Extraer la URL del logo
          }
        }

        return {
          id: doc.id, // Incluye el ID del documento
          ...filteredData,
          logo: logoUrl // Reemplazar logoId con la URL del logo
        }
      })
    )

    res.status(200).json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
}

/**
 * Obtiene los datos de un usuario específico por su ID.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario a obtener.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con los datos del usuario.
 */

const getUserById = async (req, res) => {
  // const companyID = req.user.rol === 'co' ? req.user.id : req.params.id
  const companyID = req.user.id || req.params.id
  // const companyID = req.user.id ? req.user.id : req.params.id

  try {
    // Obtener el usuario por ID
    const userDoc = await db.collection('users').doc(companyID).get()

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' })
    }

    const userData = userDoc.data()
    const { password, logo: logoId, ...filteredData } = userData // Excluir contraseña y obtener logoId
    let logoUrl = null

    // Si la empresa tiene un logoId, buscar la URL en la colección 'logos'
    if (logoId) {
      const logoSnapshot = await db
        .collection('logos')
        .where('companyId', '==', userDoc.id)
        .get()

      if (!logoSnapshot.empty) {
        const logoDoc = logoSnapshot.docs[0] // Tomar el primer documento encontrado
        const logoData = logoDoc.data()
        logoUrl =
          'https://backend-node-wpf9.onrender.com/proxy?url=' + logoData.url // Extraer la URL del logo
      }
    }

    res.status(200).json({
      user: {
        id: userDoc.id,
        ...filteredData,
        logo: logoUrl // Incluir la URL del logo
      }
    })
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    res.status(500).json({ error: 'Failed to get user by ID' })
  }
}

/**
 * Actualiza los datos de un usuario específico.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario a actualizar.
 * @param {string} req.body.name - Nuevo nombre del usuario (opcional).
 * @param {string} req.body.email - Nuevo correo electrónico del usuario (opcional).
 * @param {string} req.body.password - Nueva contraseña del usuario (opcional).
 * @param {string} req.body.rol - Nuevo rol del usuario (opcional).
 * @param {string} req.body.phone - Nuevo teléfono del usuario (opcional).
 * @param {string} req.body.subname - Nuevo subnombre del usuario (opcional).
 * @param {string} req.body.studies - Nuevos estudios del usuario (opcional).
 * @param {string} req.body.cif - Nuevo CIF del usuario (solo para empresas).
 * @param {string} req.body.dni - Nuevo DNI del usuario (solo para visitantes).
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito.
 */

const updateUser = async (req, res) => {
  const { id } = req.params // Obtén el ID de los parámetros
  const { name, email, password, rol, phone, subname, studies, cif, dni } =
    req.body

  try {
    // Obtener referencia del usuario
    const userRef = db.collection('users').doc(id)
    const userSnapshot = await userRef.get()

    if (!userSnapshot.exists) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Actualizar campos dinámicamente
    let userData = {}

    if (name) userData.name = name
    if (email) userData.email = email
    if (rol) userData.rol = rol

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10) // Hashear nueva contraseña
      userData.password = hashedPassword
    }

    if (rol === 'co') {
      if (!cif) {
        return res.status(400).json({
          error: 'invalid_cif',
          message: 'CIF is required for Company.'
        })
      }
      userData.cif = cif
    }

    if (rol === 'visitor') {
      if (!dni || !studies) {
        return res.status(400).json({
          error: 'invalid_dni',
          message: 'DNI and studies are required for Visitor.'
        })
      }
      userData.dni = dni
      userData.subname = subname
      userData.studies = studies
      userData.phone = phone
    }

    // Actualizar usuario en Firestore
    await userRef.update(userData)

    res.status(200).json({ message: 'User updated successfully', id })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
}

/**
 * Elimina un usuario específico.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario a eliminar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito o error.
 */

const deleterUser = async (req, res) => {
  const { id } = req.params // Accede directamente al ID

  try {
    const userRef = db.collection('users').doc(id)
    const userSnapshot = await userRef.get()

    // Verificar si el usuario existe
    if (!userSnapshot.exists) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Eliminar el usuario
    await userRef.delete()

    res.status(200).json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

/**
 * Obtiene todos los usuarios con rol "co" y sus datos relacionados.
 *
 * Este método consulta la colección `users` para obtener los usuarios con el rol "co".
 * Luego, recupera datos relacionados de las colecciones `offers`, `video`, `company` y `design`.
 * También incluye información de `stand`, `model` y `files` para el diseño, si está disponible.
 *
 * @async
 * @function getCompanyAll
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} Respuesta JSON con una lista de usuarios y sus datos relacionados.
 *
 * */

const getCompanyAll = async (req, res) => {
  try {
    const userSnapshot = await db
      .collection('users')
      .where('rol', '==', 'co')
      .get()

    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'No hay empresas' })
    }
    const users = userSnapshot.docs.map((doc) => {
      const data = doc.data()
      const { password, createdAt, rol, ...filteredData } = data // Excluir contraseña
      return {
        id: doc.id, // Incluye el ID del documento
        ...filteredData
      }
    })

    const results = await Promise.all(
      users.map(async (user) => {
        // Buscar documentos relacionados en otras colecciones
        const [
          offersSnapshot,
          videosSnapshot,
          companySnapshot,
          designSnapshot,
          logoSnapshot
        ] = await Promise.all([
          db.collection('offers').where('companyID', '==', user.id).get(),
          db.collection('video').where('companyID', '==', user.id).get(),
          db.collection('company').where('companyID', '==', user.id).get(),
          db.collection('design').where('companyID', '==', user.id).get(),
          db.collection('logos').where('companyId', '==', user.id).get()
        ])

        const logo = logoSnapshot.docs.map((doc) => {
          const data = doc.data()
          const { companyID, uploadedAt, ...filtaredLogoData } = data
          return {
            id: doc.id,
            ...filtaredLogoData,
            url: `https://backend-node-wpf9.onrender.com/proxy?url=${filtaredLogoData.url}`
          }
        })

        // Mapear resultados de las colecciones relacionadas
        const offers = offersSnapshot.docs.map((doc) => {
          const data = doc.data()
          const { companyID, createdAt, ...filtaredOffersData } = data
          return {
            id: doc.id,
            ...filtaredOffersData
          }
        })
        const videos = videosSnapshot.docs.map((doc) => {
          const data = doc.data()
          const { companyID, ...filtaredVideoData } = data
          return {
            id: doc.id,
            ...filtaredVideoData
          }
        })
        const companies = companySnapshot.docs.map((doc) => {
          const data = doc.data()
          const { companyID, ...filtaredCompaniesData } = data
          return {
            id: doc.id,
            ...filtaredCompaniesData
          }
        })

        let designData = null
        if (!designSnapshot.empty) {
          const designDoc = designSnapshot.docs[0]
          const designDetails = designDoc.data()
          const {
            standID,
            modelID,
            fileID,
            companyID,
            createdAt,
            ...filteredDesign
          } = designDetails

          // Obtener datos del stand, modelo y archivos relacionados
          const [standSnapshot, modelSnapshot, fileSnapshot] =
            await Promise.all([
              standID ? db.collection('stand').doc(standID).get() : null,
              modelID ? db.collection('model').doc(modelID).get() : null,
              fileID ? db.collection('files').doc(fileID).get() : null
            ])

          const standData = standSnapshot?.exists
            ? (() => {
                const { standConfig, uploadedAt, ...filteredData } =
                  standSnapshot.data() // Excluir stand_config
                return {
                  id: standSnapshot.id,
                  ...filteredData,
                  name: filteredData.url.name,
                  url: `https://backend-node-wpf9.onrender.com/proxy?url=${filteredData.url.fileUrl}`
                }
              })()
            : null

          const modelData = modelSnapshot?.exists
            ? (() => {
                const { uploadedAt, ...filteredData } = modelSnapshot.data() // Puedes aplicar un filtro similar aquí si es necesario
                return {
                  id: modelSnapshot.id,
                  ...filteredData,
                  url: `https://backend-node-wpf9.onrender.com/proxy?url=${filteredData.url.fileUrl}`
                }
              })()
            : null

          const fileData = fileSnapshot?.exists
            ? (() => {
                const { companyID, createdAt, ...filteredData } =
                  fileSnapshot.data() // Puedes aplicar otro filtro aquí si es necesario
                return {
                  id: fileSnapshot.id,
                  ...filteredData
                }
              })()
            : null

          designData = {
            ...filteredDesign,
            stand: standData,
            model: modelData,
            files: fileData
          }
        }

        return {
          user,
          logo,
          relatedData: {
            offers,
            videos,
            companies,
            design: designData
          }
        }
      })
    )

    return res.status(200).json(results)
  } catch (error) {
    console.error('Error al obtener usuarios con rol "co":', error)
    return res.status(500).json({
      message: 'Error al obtener usuarios con rol "co".',
      error: error.message
    })
  }
}

/**
 * Actualiza el logo de una empresa.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del usuario (empresa) cuyo logo se actualizará.
 * @param {file} req.files.logo - Nuevo archivo de logo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito o error.
 */
const updateLogo = async (req, res) => {
  const id = req.user.rol === 'admin' ? req.params.id : req.user.id
  // const logoUpload = req.files?.logo ? req.files.logo[0] : null // Nuevo archivo de logo
  const logoUpload = req?.file ? req?.file : null // Nuevo archivo de logo

  if (!logoUpload) {
    return res.status(400).json({ message: 'No logo file provided.' })
  }

  try {
    // Buscar el usuario por ID
    const userDoc = await db.collection('users').doc(id).get()

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const userData = userDoc.data()

    // Verificar si el usuario tiene un logo asociado
    const logoSnapshot = await db
      .collection('logos')
      .where('companyId', '==', id)
      .get()

    if (logoSnapshot.empty) {
      return res.status(404).json({ message: 'Logo not found for this user.' })
    }

    const logoDoc = logoSnapshot.docs[0]
    const logoData = logoDoc.data()

    // Eliminar el logo anterior de Google Drive
    const previousLogoFileId = logoData.url.split('id=')[1].split('&')[0] // Extraer el file ID del URL
    console.log('previousLogoFileId', previousLogoFileId)
    // await admin.drive.files?.delete({ fileId: previousLogoFileId })
    await deleteFileFromDrive(previousLogoFileId)

    // Subir el nuevo logo a Google Drive
    const newLogoResponse = await uploadFileToDrive(logoUpload, 'logos')
    const newLogoUrl = newLogoResponse.webViewLink

    // Actualizar la URL del logo en Firestore
    await db.collection('logos').doc(logoDoc.id).update({
      url: newLogoUrl,
      uploadedAt: admin.firestore.Timestamp.now()
    })

    // Limpia el archivo temporal
    fs.unlink(logoUpload.path, (err) => {
      if (err) console.error('Error eliminando archivo temporal:', err)
    })

    res.status(200).json({ message: 'Logo updated successfully', newLogoUrl })
  } catch (error) {
    console.error('Error updating logo:', error)
    res.status(500).json({ error: 'Failed to update logo' })
  }
}

module.exports = {
  register,
  getAllCompany,
  getAllVisitor,
  getAllAdmin,
  getAllUsers,
  getUserById,
  updateUser,
  deleterUser,
  getCompanyAll,
  updateLogo
}

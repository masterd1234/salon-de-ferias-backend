/** 
 * @module AuthRoutes
 * 
 * Este módulo define las rutas relacionadas con la autenticación.
 * Incluye rutas para iniciar sesión y cerrar sesión.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @function login
 * @description Maneja el proceso de inicio de sesión de los usuarios.
 * Verifica si el usuario existe (por nombre o correo electrónico) y valida su contraseña.
 * Si es válido, genera un token JWT y lo almacena como cookie.
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {string} req.body.nameOrEmail - Nombre o correo electrónico del usuario.
 * @param {string} req.body.password - Contraseña del usuario.
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @returns {Object} JSON con mensaje de éxito y datos del usuario si las credenciales son válidas.
 * @throws {401} Si el usuario no existe o la contraseña es inválida.
 * @throws {500} Si ocurre un error interno del servidor.
 */

router.post ('/login', authController.login);

/**
 * @function logout
 * @description Maneja el proceso de cierre de sesión de los usuarios.
 * Elimina la cookie que contiene el token JWT.
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @returns {Object} JSON con un mensaje de éxito si el cierre de sesión es exitoso.
 * @throws {500} Si ocurre un error interno del servidor.
 */

router.post ('/logout', authController.logout);

router.post ('/logging/unity', authController.loggingForUnity);

module.exports = router;

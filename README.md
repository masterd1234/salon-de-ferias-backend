
# Backend Project

This project serves as the backend for a web application, implementing RESTful APIs and integrating various third-party services such as Firebase and Google Drive.

## Project Structure

The project is organized as follows:

```
back/
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts
├── package-lock.json             # Lock file for dependencies
├── src/
│   ├── app.js                    # Main application file
│   ├── config/
│   │   ├── credentialsDrive.json # Google Drive credentials
│   │   ├── credentialsFirebase.json # Firebase credentials
│   │   └── firebaseConfig.js     # Firebase configuration
│   ├── controllers/              # Controller logic for API endpoints
│   │   ├── authController.js
│   │   ├── designController.js
│   │   ├── fileController.js
│   │   ├── informationController.js
│   │   ├── offersController.js
│   │   ├── userController.js
│   │   └── videoController.js
│   ├── middlewares/              # Middleware functions
│   │   └── authMiddleware.js
│   ├── routes/                   # API route definitions
│   │   ├── auth.js
│   │   ├── design.js
│   │   ├── file.js
│   │   ├── information.js
│   │   ├── offers.js
│   │   ├── users.js
│   │   └── video.js
│   └── service/                  # Service logic
│       └── googleDrive.js
```

## Prerequisites

Ensure you have the following installed on your system:
- Node.js (>=14.x)
- npm (>=6.x)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd back
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in the required environment variables.

4. Ensure you have the necessary Firebase and Google Drive credentials configured.

## Running the Application

To start the application in development mode:
```bash
npm run dev
```

For production:
```bash
npm start
```

## API Endpoints

The application provides the following endpoints:

### Authentication
#### 1. User Login

- **Endpoint**: `POST /auth/login`
- **Requires Authentication**: No
- **Headers**:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body (JSON)**:
  ```json
  {
    "nameOrEmail": "user@example.com", // Can be either email or username
    "password": "securepassword123"
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Login successful",
    "user": {
      "name": "User Name",
      "rol": "admin | co | visitor"
    }
  }
  ```
- **Cookies**:
  - `authToken`: A secure HTTP-only cookie containing the JWT token.
- **Possible Errors** (`400`, `401`, `500`):
  ```json
  {
    "message": "Please enter both name and password" // (400 - Missing fields)
  }

  {
    "error": "user_not_found",
    "message": "User not found" // (401 - User doesn't exist)
  }

  {
    "error": "invalid_password",
    "message": "Password invalid." // (401 - Invalid password)
  }

  {
    "error": "internal_server_error",
    "message": "Server error occurred" // (500 - Internal server error)
  }
  ```

---

#### 2. User Logout

- **Endpoint**: `POST /auth/logout`
- **Requires Authentication**: No
- **Headers**:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Possible Errors** (`500`):
  ```json
  {
    "message": "Error logging out"
  }
  ```


---


### Users
#### 1. Register a New User

- **Endpoint**: `POST users/register`
- **Requires Authentication**: No
- **Headers**:
  ```json
  {
    "Content-Type": "multipart/form-data"
  }
  ```
- **Body (form-data)**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "securepassword123",
    "rol": "visitor", // Can be 'admin', 'co', or 'visitor'
    "file": (Optional file: Image or logo),
    "cv": (Optional file: Curriculum Vitae),
    "phone": "123456789", // Only for visitors
    "subname": "Smith",   // Only for visitors
    "studies": "Engineering", // Only for visitors
    "cif": "B12345678", // Only for companies
    "dni": "12345678A" // Only for visitors
  }
  ```
- **Successful Response** (`201`):
  ```json
  {
    "message": "User created successfully",
    "id": "generated_user_id"
  }
  ```
- **Possible Errors** (`400`, `500`):
  ```json
  {
    "error": "invalid_request",
    "message": "Invalid request."
  }
  ```

---

#### 2. Get All Companies

- **Endpoint**: `GET users/companies`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  {
    "companies": [
      {
        "id": "company_id_1",
        "name": "Company 1",
        "email": "company1@example.com",
        "cif": "B12345678",
        "desing": "True || False ",
        "information": "True || False",
        "logo": "https://drive.google.com/..."
      },
      {
        "id": "company_id_2",
        "name": "Company 2",
        "email": "company2@example.com",
        "cif": "B12345678",
        "desing": "True || False ",
        "information": "True || False",
        "logo": "https://drive.google.com/..."
      },
      ...
    ]
  }
  ```

---

#### 3. Get All Visitors

- **Endpoint**: `GET users/visitors`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  {
    "visitors": [
      {
        "id": "visitor_id_1",
        "name": "John Doe",
        "subname": "Smith",
        "email": "john.doe@example.com",
        "dni": "12345678A",
        "studies": "Engineering",
        "phone": "1234567890",
        "image": "https://drive.google.com/...",
        "cv": "https://drive.google.com/...",
      },
      {
        "id": "visitor_id_2",
        "name": "John",
        "subname": "Smith",
        "email": "john@example.com",
        "dni": "12345678A",
        "studies": "Engineering",
        "phone": "1234567890",
        "image": "https://drive.google.com/...",
        "cv": "https://drive.google.com/...",
      },
      ...
    ]
  }
  ```

---

#### 4. Get All Admins

- **Endpoint**: `GET users/admins`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  {
    "admins": [
      {
        "id": "admin_id_1",
        "name": "Admin Name",
        "email": "admin@example.com",
      },
      {
        "id": "admin_id_2",
        "name": "Admin Name",
        "email": "admin@example.com",
      },
      ...
    ]
  }
  ```

---

#### 5. Get All Users

- **Endpoint**: `GET users/all`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  {
    "users": [
      {
        "id": "company_id_1",
        "name": "Company 1",
        "email": "company1@example.com",
        "cif": "B12345678",
        "desing": "True || False ",
        "information": "True || False",
        "logo": "https://drive.google.com/...",
        "rol": "co"
      },
      {
        "id": "visitor_id_1",
        "name": "John",
        "subname": "Smith",
        "email": "john@example.com",
        "dni": "12345678A",
        "studies": "Engineering",
        "phone": "1234567890",
        "image": "https://drive.google.com/...",
        "cv": "https://drive.google.com/...",
        "rol": "visitor"
      },
      {
        "id": "admin_id_1",
        "name": "Admin Name",
        "email": "admin@example.com",
        "rol": "admin"
      },
      ...
    ]
  }
  ```

---

#### 6. Get User by ID

- **Endpoint**: `GET users/:id` (If don't 'co') or `GET users/` (If 'co')
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):

  ```json
  {
    "user": {
        "id": "company_id_1",
        "name": "Company 1",
        "email": "company1@example.com",
        "cif": "B12345678",
        "desing": "True || False ",
        "information": "True || False",
        "logo": "https://drive.google.com/...",
        "rol": "co"
    }
  }

  {
    "user": {
        "id": "visitor_id_1",
        "name": "John",
        "subname": "Smith",
        "email": "john@example.com",
        "dni": "12345678A",
        "studies": "Engineering",
        "phone": "1234567890",
        "image": "https://drive.google.com/...",
        "cv": "https://drive.google.com/...",
        "rol": "visitor"
    }
  }

  {
    "user": {
        "id": "admin_id_1",
        "name": "Admin Name",
        "email": "admin@example.com",
        "rol": "admin"
    }
  }
  ```

---

#### 7. Update User

- **Endpoint**: `PUT /:id`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body (JSON)**:
  ```json
  {
    "name": "New Name",
    "email": "new.email@example.com",
    "password": "newpassword123",
    "rol": "co",
    "cif": "B87654321", // Only for companies
    "dni": "87654321A", // Only for visitors
    "subname": "New Subname", // Only for visitors
    "studies": "New Studies", // Only for visitors
    "phone": "9876543210" // Only for visitors
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "User updated successfully",
    "id": "user_id"
  }
  ```

---

#### 8. Delete User

- **Endpoint**: `DELETE /:id`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  {
    "message": "User deleted successfully"
  }
  ```

---

#### 9. Get Companies with Related Data

- **Endpoint**: `GET /users/companies/unity`
- **Requires Authentication**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Body**: N/A
- **Successful Response** (`200`):
  ```json
  [
    {
      "user": {
        "id": "company_id",
        "name": "Company 1",
        "email": "company1@example.com"
      },
      "relatedData": {
        "offers": [
          {
            "id": "offer_id",
            "companyName": "Company 1",
            "description": "Example....",
            "job_type": "Full-time | Part-time | Internship | Freelance",
            "location": "Location",
            "position": "Position",
            "sector": " tic | finanzas | energia | salud | manufactura | automotriz | alimentacion | transporte | construccion | aeronautica | turismo | educacion | agricultura | biotecnologia | retail | seguros | medios | consultoria | inmobiliario | quimica | rrhh | moda | ecommerce | arte | deportes | medioambiente | legales | investigacion | maritimo",
            "workplace_type": "office | remote | hybrid",
            "logo": "logo_url",
          }
          ...
        ],
        "videos": [{
          "id": "video_id",
          "urls": ["url1", "url2"],
          }
        ],
        "info": [
          {
            "id": "info_id",
            "description" : "Example....",
            "informaiton" : "Information additional example ...",
            "links": [{
                "additionalButtonTitle": "link1",
                "additionalButtonLink": "urlLink1"
              },
              ...
              ],
            "documents": [{
              "fileName": "documentName",
              "url": "documentUrl"
              },
              ...
            ],
             "sector": " tic | finanzas | energia | salud | manufactura | automotriz | alimentacion | transporte | construccion | aeronautica | turismo | educacion | agricultura | biotecnologia | retail | seguros | medios | consultoria | inmobiliario | quimica | rrhh | moda | ecommerce | arte | deportes | medioambiente | legales | investigacion | maritimo"
          }
        ],
        "design": {
          "id": "design_id",
          "logo": "logo_url",
          "stand":{
            "id": "stand_id",
            "url":{
              "fileMetada": {
                "name": "stand_name",
                "fileUrl": "stand_url"
              }
            }
          },
          "model": {
            "url":{
              "fileMetada": {
                "name": "model_name",
                "fileUrl": "model_url"
              }
            }
          },
          "file": {
            "banner": "bannerUrl",
            "poster": "posterUrl"
          }
         }
      }
    },
    ...
  ]
  ```


---

### Offers
#### 1. Add Offer

- **Endpoint**: `POST /offers/add/:id?`  (El parámetro `id` es requerido solo para Admin)
- **Authentication Required**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "position": "Software Engineer",
    "workplace_type": "Remote",
    "location": "Madrid, Spain",
    "job_type": "Full-time",
    "sector": "Technology",
    "description": "This is a sample job description."
  }
  ```
- **Successful Response** (`201`):
  ```json
  {
    "message": "Oferta añadida con éxito",
    "id": "offer_id"
  }
  ```
- **Possible Errors**:
  - `400`:
    ```json
    { "message": "Todos los campos son obligatorios" }
    ```
  - `404`:
    ```json
    { "message": "No se encontró información de la empresa" }
    ```
  - `500`:
    ```json
    { "message": "Error al agregar oferta" }
    ```

---

#### 2. Get Offers By Company

- **Endpoint**: `GET /offers/company/:id?` (El parámetro `id` es requerido solo para Admin o Visitor)
- **Authentication Required**: Yes (Admin, Company, Visitor)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Ofertas obtenidas con éxito",
    "offers": [
      {
        "id": "offer_id",
        "position": "Software Engineer",
        "workplace_type": "office | remote | hybrid",
        "location": "Madrid, Spain",
        "job_type": "Full-time | Part-time | Freelance | Internship",
        "description": "This is a sample job description.",
        "comapnyID": "company_id",
        "sector": " tic | finanzas | energia | salud | manufactura | automotriz | alimentacion | transporte | construccion | aeronautica | turismo | educacion | agricultura | biotecnologia | retail | seguros | medios | consultoria | inmobiliario | quimica | rrhh | moda | ecommerce | arte | deportes | medioambiente | legales | investigacion | maritimo",
        "logo": "https://example.com/logo.png",
        "companyName": "Company Name"
      },
      ...
    ]
  }
  ```
- **Possible Errors**:
  - `400`:
    ```json
    { "message": "El ID es obligatorio" }
    ```
  - `500`:
    ```json
    { "message": "Error al obtener ofertas" }
    ```

---

#### 3. Delete Offer

- **Endpoint**: `DELETE /offers/delete/:id`
- **Authentication Required**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  { "message": "Oferta eliminada con éxito" }
  ```
- **Possible Errors**:
  - `500`:
    ```json
    { "message": "Error al eliminar oferta" }
    ```

---

#### 4. Update Offer

- **Endpoint**: `PUT /offers/update/:id`
- **Authentication Required**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "position": "Updated Position",
    "workplace_type": "Hybrid",
    "location": "Barcelona, Spain",
    "job_type": "Part-time",
    "sector": "Education",
    "description": "Updated description."
  }
  ```
- **Successful Response** (`200`):
  ```json
  { "message": "Oferta actualizada con éxito" }
  ```
- **Possible Errors**:
  - `500`:
    ```json
    { "message": "Error al actualizar oferta" }
    ```

---

#### 5. Get All Offers

- **Endpoint**: `GET /offers/all`
- **Authentication Required**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  [
      {
        "id": "offer_id",
        "position": "Software Engineer",
        "workplace_type": "office | remote | hybrid",
        "location": "Madrid, Spain",
        "job_type": "Full-time | Part-time | Freelance | Internship",
        "description": "This is a sample job description.",
        "comapnyID": "company_id",
        "sector": " tic | finanzas | energia | salud | manufactura | automotriz | alimentacion | transporte | construccion | aeronautica | turismo | educacion | agricultura | biotecnologia | retail | seguros | medios | consultoria | inmobiliario | quimica | rrhh | moda | ecommerce | arte | deportes | medioambiente | legales | investigacion | maritimo",
        "logo": "https://example.com/logo.png",
        "companyName": "Company Name"
      },
      ...
  ]
  ```
- **Possible Errors**:
  - `404`:
    ```json
    { "message": "No se encontraron ofertas." }
    ```
  - `500`:
    ```json
    { "message": "Error al recuperar las ofertas" }
    ```

---

#### 6. Search Offers

- **Endpoint**: `GET /offers/search`
- **Authentication Required**: Yes (All roles)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Query Parameters**:
  - `keyword` (optional): Search keyword.
  - `location` (optional): Location of the job.
  - `job_type` (optional): Type of job (e.g., "Full-time").
  - `workplace_type` (optional): Workplace type (e.g., "Remote").
  - `company` (optional): Company name.
  - `sector` (optional): Sector of the job.
- **Successful Response** (`200`):
  ```json
  [
      {
        "id": "offer_id",
        "position": "Software Engineer",
        "workplace_type": "office | remote | hybrid",
        "location": "Madrid, Spain",
        "job_type": "Full-time | Part-time | Freelance | Internship",
        "description": "This is a sample job description.",
        "comapnyID": "company_id",
        "sector": " tic | finanzas | energia | salud | manufactura | automotriz | alimentacion | transporte | construccion | aeronautica | turismo | educacion | agricultura | biotecnologia | retail | seguros | medios | consultoria | inmobiliario | quimica | rrhh | moda | ecommerce | arte | deportes | medioambiente | legales | investigacion | maritimo",
        "logo": "https://example.com/logo.png",
        "companyName": "Company Name"
      },
      ...
  ](Te devuelve las ofertas que coinciden con los criterios de búsqueda)
  ```
- **Possible Errors**:
  - `404`:
    ```json
    { "message": "No se encontraron ofertas." }
    ```
  - `500`:
    ```json
    { "message": "Error al buscar ofertas." }
    ```


### Information
#### 1. Add Company Information

- **Endpoint**: `POST /information/addInfo/:id?` (El parámetro `id` es requerido solo para Admin)
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "multipart/form-data"
  }
  ```
##### Para **Admin**:
- **Descripción**: Los administradores pueden añadir información para cualquier compañía. Deben proporcionar el parámetro `id` en la URL para indicar el ID de la compañía.
- **URL Ejemplo**: `POST /addInfo/12345`
- **Body (form-data)**:
  ```json
  {
    "description": "Company description",
    "additional_information": "Additional info",
    "links": [
      {
        "aditionalButtonTitle": "Title",
        "additionalButtonLink": "https://link.com"
      }
    ],
    "sector": "IT",
    "documents": [ (Optional file array: Documents) ]
  }
  ```
- **Successful Response** (`201`):
  ```json
  {
    "message": "Information company added successfully",
    "id": "info_id"
  }
  ```

##### Para **Company**:
- **Descripción**: Las compañías pueden añadir información solo para sí mismas. No necesitan proporcionar el parámetro `id`, ya que se obtiene del token de autenticación.
- **URL Ejemplo**: `POST /addInfo`
- **Body (form-data)**: Igual al descrito para Admin.
- **Possible Errors** (`400`, `403`, `500`):
  ```json
  {
    "message": "Description is required"
  }
  {
    "error": "Access denied: Visitors cannot add company information."
  }
  {
    "message": "Error adding information company"
  }
  ```

---

#### 2. Get Company Information

- **Endpoint**: `GET /informtation/getInfo/:id?` (El parámetro `id` es requerido para Admin y Visitor)
- **Requires Authentication**: Yes (Admin, Company, Visitor)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "description": "Company description",
    "information": "Additional information",
    "links": [
      {
        "aditionalButtonTitle": "Title",
        "additionalButtonLink": "https://link.com"
      }
    ],
    "sector": "IT",
    "documents": [
      {
        "fileName": "document.pdf",
        "url": "https://drive.google.com/..."
      }
    ]
  }
  ```
- **Possible Errors** (`400`, `404`, `500`):
  ```json
  {
    "message": "Company ID is required"
  }
  {
    "message": "Company not found"
  }
  {
    "message": "Error getting information company"
  }
  ```

---

#### 3. Update Company Information

- **Endpoint**: `PUT /information/updateInfo/:id?` (El parámetro `id` es requerido solo para Admin)
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body (JSON)**:
  ```json
  {
    "description": "Updated description",
    "additional_information": "Updated additional info",
    "links": [
      {
        "aditionalButtonTitle": "Updated Title",
        "additionalButtonLink": "https://updated-link.com"
      }
    ],
    "sector": "Updated Sector"
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Company information updated successfully",
    "updatedData": {
      "description": "Updated description",
      "additional_information": "Updated additional info",
      "sector": "Updated Sector"
    }
  }
  ```
- **Possible Errors** (`400`, `404`, `500`):
  ```json
  {
    "message": "Links must have additionalButtonTitle and additionalButtonLink"
  }
  {
    "message": "Company not found"
  }
  {
    "message": "Error updating company information"
  }
  ```

---

#### 4. Delete Company Documents

- **Endpoint**: `PUT /information/deleteDocuments/:id?` (El parámetro `id` es requerido solo para Admin)
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body (JSON)**:
  ```json
  {
    "documentsToKeep": [
      {
        "fileName": "document.pdf"
      }
    ] (Array con los documentos que se deben conservar)
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "success": true,
    "message": "Documents updated successfully. Unnecessary documents deleted from Google Drive.",
    "updatedDocuments": [
      {
        "fileName": "document.pdf"
      }
    ]
  }
  ```
- **Possible Errors** (`400`, `404`, `500`):
  ```json
  {
    "message": "documentsToKeep array is required"
  }
  {
    "message": "Company not found"
  }
  {
    "message": "Error deleting documents and updating Firestore"
  }
  ```

---

#### 5. Update Company Documents

- **Endpoint**: `PUT /information/updateDocuments/:id?` (El parámetro `id` es requerido solo para Admin)
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "multipart/form-data"
  }
  ```
- **Body (form-data)**:
  ```json
  {
    "newDocuments": [
      {
        "fileName": "document.pdf"
      }
    ](Nuevos documentos proporcionados en el cuerpo de la solicitud)
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Documents updated successfully",
    "updatedDocuments": [
      {
        "fileName": "document.pdf",
        "url": "https://drive.google.com/..."
      }
    ]
  }
  ```
- **Possible Errors** (`400`, `404`, `500`):
  ```json
  {
    "message": "New documents array is required"
  }
  {
    "message": "Company not found"
  }
  {
    "message": "Error updating documents"
  }
  ```


### Videos
#### 1. Add Video
- **Endpoint**: `POST /video/add/:id?` (El parámetro `id` es requerido solo para Admin)
- **Authentication Required**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "url": "https://example.com/video"
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Video añadido al array existente",
      "id": "video_document_id",
      "urls": ["https://example.com/video", ...]
    }
    ```
  - **201 Created**:
    ```json
    {
      "message": "Documento de video creado y video añadido",
      "id": "video_document_id",
      "urls": ["https://example.com/video"]
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "message": "La URL del video es obligatoria"
    }
    ```
    ```json
    {
      "message": "El video ya existe en la lista"
    }
    ```
  - **403 Forbidden**:
    ```json
    {
      "error": "Access denied: Visitors cannot add videos."
    }
    ```

#### 2. Get Videos by Company ID
- **Endpoint**: `GET /video/company/:id?` (El parámetro `id` es requerido solo para Admin o Visitor)
- **Authentication Required**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "id": "video_document_id",
        "companyID": "company_id",
        "urls": ["https://example.com/video1", "https://example.com/video2"]
      }
    ]
    ```
  - **400 Bad Request**:
    ```json
    {
      "message": "El companyID es obligatorio"
    }
    ```
  - **403 Forbidden**:
    ```json
    {
      "error": "Access denied: Visitors cannot view videos."
    }
    ```
  - **404 Not Found**:
    ```json
    {
      "message": "No se encontraron videos para esta compañía"
    }
    ```

#### 3. Delete Video URL
- **Endpoint**: `DELETE /video/delete/:id?`(El parámetro `id` es requerido solo para Admin)
- **Authentication Required**: Yes
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "url": "https://example.com/video"
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "URL eliminada con éxito del array de videos",
      "removedUrl": "https://example.com/video"
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "message": "El companyID y la URL son obligatorios"
    }
    ```
  - **403 Forbidden**:
    ```json
    {
      "error": "Access denied: Visitors cannot delete video URLs."
    }
    ```
  - **404 Not Found**:
    ```json
    {
      "message": "No se encontraron videos para esta compañía"
    }
    ```


### Design

#### 1. Add Design

- **Endpoint**: `POST /design/addDesign/:id?`(don't id for 'co')
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "multipart/form-data"
  }
  ```
- **Body (form-data)**:
  ```json
  {
    "standID": "stand_id",
    "modelID": "model_id",
    "banner": (Optional file: Banner image),
    "poster": (Optional file: Poster image)
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Design created successfully",
    "idDesign": "design_id"
  }
  ```
- **Possible Errors** (`400`, `403`, `404`, `500`):
  ```json
  {
    "message": "Please provide standID and modelID"
  }
  {
    "error": "Access denied: Visitors cannot add designs."
  }
  {
    "message": "Design already exists for this company"
  }
  {
    "message": "Error creating design"
  }
  ```

---

#### 2. Get Design

- **Endpoint**: `GET /design/getDesign/:id?` (don't id for 'co')
- **Requires Authentication**: Yes (Admin, Company, Visitor)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "design": {
      "id": "design_id",
      "companyID": "company_id",
      "logo": "https://drive.google.com/...",
    },
    "stand": {
        "id": "stand_id",
        "url": {
            "fileUrl": "https://drive.google.com/...",
            "fileMetadata": {
                "name": "standName"
            }
        },
        "standConfig": {
            "recepcionistPosition": {
                "x": 0.3,
                "y": 0.348,
                "width": 0.4,
                "height": 0.225
            },
            "logoPosition": {
                "x": 0.3,
                "y": 0.63,
                "width": 0.4,
                "height": 0.1
            },
            "bannerPosition": {
                "x": 0.35,
                "y": 0.37,
                "width": 0.308,
                "height": 0.155
            }
        },
        "uploadedAt": {
            "_seconds": 1732521583,
            "_nanoseconds": 33000000
        }
    },
    "model": {
        "id": "model_id",
        "url": {
            "fileUrl": "https://drive.google.com/uc?id=1Lh7EQHRdhIuE78LOOuWgS7U7SZ1GW8CP&export=download",
            "fileMetadata": {
                "name": "recepcionist1.png"
            }
        },
        "uploadedAt": {
            "_seconds": 1732617225,
            "_nanoseconds": 112000000
        }
    },
    "files": {
        "id": "file_id",
        "companyID": "company_id",
        "banner": "https://drive.google.com/file/d/1eIsIsE2B8l1jVsP0RBSJ8ztdCyKlGi9l/view?usp=drivesdk",
        "poster": null,
        "createdAt": {
            "_seconds": 1733131745,
            "_nanoseconds": 719000000
        }
    }
  }
  ```
- **Possible Errors** (`400`, `403`, `404`, `500`):
  ```json
  {
    "message": "Design not found for this company."
  }
  {
    "error": "Missing parameter: ID is required for visitors and admins."
  }
  {
    "message": "An error occurred while fetching the design."
  }
  ```

---

#### 3. Get All Designs

- **Endpoint**: `GET /design/allDesigns`
- **Requires Authentication**: Yes (Admin)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  [
    {
      "design": {
        "id": "desing_id",
        "companyID": "company_id",
        "logo": "https://drive.google.com/..."
      },
        "stand": {
          "id": "stand_id",
          "url": {
            "fileUrl": "https://drive.google.com/...",
            "fileMetadata": {
                "name": "standName"
            }
          },
          "standConfig": {
            "recepcionistPosition": {
                "x": 0.3,
                "y": 0.348,
                "width": 0.4,
                "height": 0.225
            },
            "logoPosition": {
                "x": 0.3,
                "y": 0.63,
                "width": 0.4,
                "height": 0.1
            },
            "bannerPosition": {
                "x": 0.35,
                "y": 0.37,
                "width": 0.308,
                "height": 0.155
            }
          },
          "uploadedAt": {
            "_seconds": 1732521583,
            "_nanoseconds": 33000000
          }
        },
        "model": {
          "id": "model_id",
          "url": {
            "fileUrl": "https://drive.google.com/uc?id=1Lh7EQHRdhIuE78LOOuWgS7U7SZ1GW8CP&export=download",
            "fileMetadata": {
              "name": "recepcionist1.png"
            }
          },
          "uploadedAt": {
            "_seconds": 1732617225,
            "_nanoseconds": 112000000
          }
        },
        "files": {
          "id": "file_id",
          "companyID": "company_id",
          "banner": "https://drive.google.com/file/d/1eIsIsE2B8l1jVsP0RBSJ8ztdCyKlGi9l/view?usp=drivesdk",
          "poster": null,
          "createdAt": {
            "_seconds": 1733131745,
            "_nanoseconds": 719000000
          }
        },
    },
    ...
  ]
  ```
- **Possible Errors** (`403`, `500`):
  ```json
  {
    "error": "Access denied: Only administrators can access all designs."
  }
  {
    "message": "An error occurred while fetching all designs."
  }
  ```

---

#### 4. Update Design

- **Endpoint**: `PUT /design/updateDesign/:id?` (don't id for 'co')
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "multipart/form-data"
  }
  ```
- **Body (form-data)**:
  ```json
  {
    "standID": "new_stand_id",
    "modelID": "new_model_id",
    "banner": (Optional file: New banner image),
    "poster": (Optional file: New poster image),
    "logo": (Optional file: New logo image)
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Design updated successfully",
    "updatedDesign": {
      "standID": "new_stand_id",
      "modelID": "new_model_id",
      "logo": "https://drive.google.com/..."
    }
  }
  ```
- **Possible Errors** (`400`, `403`, `404`, `500`):
  ```json
  {
    "message": "Design does not exist for this company."
  }
  {
    "error": "Access denied: Visitors cannot modify designs."
  }
  {
    "message": "Error updating design."
  }
  ```

---

#### 5. Delete Design

- **Endpoint**: `DELETE /design/deleteDesign/:id?` (don't id for 'co')
- **Requires Authentication**: Yes (Admin, Company)
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>"
  }
  ```
- **Successful Response** (`200`):
  ```json
  {
    "message": "Design deleted successfully"
  }
  ```
- **Possible Errors** (`403`, `404`, `500`):
  ```json
  {
    "error": "Access denied: Visitors cannot modify designs."
  }
  {
    "message": "Design not found"
  }
  {
    "message": "Error deleting design."
  }
  ```

---

#### 6. Get All Stands

- **Endpoint**: `GET /design/stand`
- **Requires Authentication**: No
- **Headers**: N/A
- **Successful Response** (`200`):
  ```json
  [
    {
          "id": "stand_id",
          "url": {
            "fileUrl": "https://drive.google.com/...",
            "fileMetadata": {
                "name": "standName"
            }
          },
          "standConfig": {
            "recepcionistPosition": {
                "x": 0.3,
                "y": 0.348,
                "width": 0.4,
                "height": 0.225
            },
            "logoPosition": {
                "x": 0.3,
                "y": 0.63,
                "width": 0.4,
                "height": 0.1
            },
            "bannerPosition": {
                "x": 0.35,
                "y": 0.37,
                "width": 0.308,
                "height": 0.155
            }
          },
          "uploadedAt": {
            "_seconds": 1732521583,
            "_nanoseconds": 33000000
          }
    },
    ...
  ]
  ```
- **Possible Errors** (`404`, `500`):
  ```json
  {
    "message": "No stands found."
  }
  {
    "message": "Error getting stands."
  }
  ```

---

#### 7. Get All Models

- **Endpoint**: `GET /design/model`
- **Requires Authentication**: No
- **Headers**: N/A
- **Successful Response** (`200`):
  ```json
  [
    {
          "id": "model_id",
          "url": {
            "fileUrl": "https://drive.google.com/uc?id=1Lh7EQHRdhIuE78LOOuWgS7U7SZ1GW8CP&export=download",
            "fileMetadata": {
              "name": "recepcionist1.png"
            }
          },
          "uploadedAt": {
            "_seconds": 1732617225,
            "_nanoseconds": 112000000
          }
    },
    ...
  ]
  ```
- **Possible Errors** (`404`, `500`):
  ```json
  {
    "message": "No models found."
  }
  {
    "message": "Error getting models."
  }
  ```

---




## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Create a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

- [Node.js](https://nodejs.org/)
- [Firebase](https://firebase.google.com/)
- [Google Drive API](https://developers.google.com/drive)# salon-de-ferias-backend

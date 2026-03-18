# Especificación del Endpoint Backend - DICOM Viewer

## Descripción

Endpoint para extraer archivos DICOM de ZIPs almacenados en Google Drive y devolverlos en el formato esperado por **OHIF Viewer**.

---

## Endpoints

### 1. `GET /api/drive/study/:fileId`

Extrae archivos DICOM de un ZIP de Google Drive y devuelve el formato OHIF.

#### Request

```http
GET /api/drive/study/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy
Authorization: Bearer <token> (opcional)
```

#### Response Exitoso (200 OK)

```json
{
  "studies": [
    {
      "StudyInstanceUID": "1.2.3.4.5.6.7.8.9",
      "StudyDate": "20240416",
      "StudyTime": "120000",
      "PatientName": "DICOM_MAJANO_JANET DE JESUS",
      "PatientID": "1967",
      "PatientSex": "F",
      "PatientBirthDate": "19670416",
      "StudyDescription": "DICOM Study",
      "ModalitiesInStudy": "CT",
      "StudyID": "18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy",
      "series": [
        {
          "SeriesInstanceUID": "1.2.3.4.5.6.7.8.9.1",
          "SeriesNumber": 1,
          "SeriesDate": "20240416",
          "SeriesDescription": "Series 1",
          "Modality": "CT",
          "bodyPartExamined": "HEAD",
          "instances": [
            {
              "SOPInstanceUID": "1.2.3.4.5.6.7.8.9.1.1",
              "wadoUri": "wadouri:https://dcom-view-server.onrender.com/api/drive/file/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy/dicom/0",
              "wadoUrl": "https://dcom-view-server.onrender.com/api/drive/file/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy/dicom/0",
              "rows": 512,
              "columns": 512,
              "sliceLocation": 0,
              "instanceNumber": 1
            },
            {
              "SOPInstanceUID": "1.2.3.4.5.6.7.8.9.1.2",
              "wadoUri": "wadouri:https://dcom-view-server.onrender.com/api/drive/file/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy/dicom/1",
              "wadoUrl": "https://dcom-view-server.onrender.com/api/drive/file/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy/dicom/1",
              "rows": 512,
              "columns": 512,
              "sliceLocation": 1,
              "instanceNumber": 2
            }
          ]
        }
      ]
    }
  ]
}
```

#### Response con Error (500 Internal Server Error)

```json
{
  "error": "Failed to extract DICOMs from ZIP",
  "details": "Error message describing what went wrong"
}
```

---

### 2. `GET /api/drive/file/:fileId/dicom/:index`

Sirve un archivo DICOM individual extraído del ZIP (usado por OHIF para cargar las imágenes).

#### Request

```http
GET /api/drive/file/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy/dicom/0
```

#### Response

- **Content-Type:** `application/dicom`
- **Body:** Binary DICOM file

---

### 3. `GET /api/drive/list-drive` (Existente)

Lista archivos del Google Drive.

#### Response

```json
{
  "files": [
    {
      "id": "16xME32uZDFhFPHdBwSIMzPO9zxWlTbOd",
      "name": "ariel",
      "mimeType": "application/vnd.google-apps.folder"
    },
    {
      "id": "18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy",
      "name": "DICOM_MAJANO_JANET DE JESUS_1967_4_16_(DRA._LUCIA_BUCIO_BORJA).zip",
      "mimeType": "application/x-zip-compressed"
    }
  ]
}
```

---

## Implementación del Backend (Node.js + Express)

### Dependencias

```bash
npm install express axios unzipper dicom-parser cors dotenv
```

### `package.json`

```json
{
  "name": "dcom-view-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "unzipper": "^0.10.14",
    "dicom-parser": "^1.8.21",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

### `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const driveRoutes = require('./routes/drive');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/drive', driveRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### `routes/drive.js`

```javascript
const express = require('express');
const router = express.Router();
const axios = require('axios');
const unzipper = require('unzipper');
const dicomParser = require('dicom-parser');

const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

// Cache para almacenar DICOMs extraídos (en memoria, usar Redis en producción)
const dicomCache = new Map();

/**
 * GET /api/drive/study/:fileId
 * Extrae DICOMs de un ZIP y devuelve formato OHIF
 */
router.get('/study/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Verificar caché
    if (dicomCache.has(fileId)) {
      console.log(`Cache hit for ${fileId}`);
      return res.json(dicomCache.get(fileId));
    }

    console.log(`Extracting DICOMs from ZIP: ${fileId}`);

    // 1. Descargar ZIP de Google Drive
    const zipResponse = await axios({
      method: 'GET',
      url: `https://drive.google.com/uc?id=${fileId}&export=download`,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const dicomFiles = [];
    const seriesMap = new Map();
    let patientName = 'Unknown';
    let studyUid = `study_${fileId}`;

    // 2. Extraer y procesar archivos .dcm del ZIP
    await new Promise((resolve, reject) => {
      zipResponse.data
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          
          if (fileName.endsWith('.dcm') || fileName.endsWith('.DCM')) {
            const chunks = [];
            entry.on('data', (chunk) => chunks.push(chunk));
            entry.on('end', () => {
              const buffer = Buffer.concat(chunks);
              try {
                const dataSet = dicomParser.parseDicom(buffer);
                
                // 3. Extraer metadatos DICOM
                const currentPatientName = dataSet.string('x00100010') || 'Unknown';
                const patientId = dataSet.string('x00100020') || fileId;
                const currentStudyUid = dataSet.string('x0020000D') || studyUid;
                const seriesUid = dataSet.string('x0020000E') || `series_${fileId}_${seriesMap.size}`;
                const modality = dataSet.string('x00080060') || 'OT';
                const seriesNumber = parseInt(dataSet.string('x00200011') || '1');
                const instanceNumber = parseInt(dataSet.string('x00200013') || '0');
                const rows = parseInt(dataSet.string('x00280010') || '512');
                const cols = parseInt(dataSet.string('x00280011') || '512');
                const sopInstanceUid = dataSet.string('x00080018') || `${seriesUid}.${instanceNumber}`;

                // Actualizar metadatos del estudio con los del primer DICOM
                if (patientName === 'Unknown' && currentPatientName !== 'Unknown') {
                  patientName = currentPatientName;
                }
                if (studyUid === `study_${fileId}` && currentStudyUid !== studyUid) {
                  studyUid = currentStudyUid;
                }

                if (!seriesMap.has(seriesUid)) {
                  seriesMap.set(seriesUid, {
                    SeriesInstanceUID: seriesUid,
                    SeriesNumber: seriesNumber,
                    Modality: modality,
                    instances: []
                  });
                }

                // Guardar archivo DICOM en cache
                const instanceIndex = dicomFiles.length;
                dicomFiles.push({ fileName, buffer, fileId, seriesUid });

                seriesMap.get(seriesUid).instances.push({
                  SOPInstanceUID: sopInstanceUid,
                  wadoUri: `wadouri:https://dcom-view-server.onrender.com/api/drive/file/${fileId}/dicom/${instanceIndex}`,
                  wadoUrl: `https://dcom-view-server.onrender.com/api/drive/file/${fileId}/dicom/${instanceIndex}`,
                  rows,
                  columns: cols,
                  instanceNumber
                });

              } catch (err) {
                console.error(`Error parsing DICOM ${fileName}:`, err.message);
              }
            });
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => {
          console.log(`ZIP extraction complete: ${dicomFiles.length} DICOM files found`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error extracting ZIP:', err.message);
          reject(err);
        });
    });

    if (dicomFiles.length === 0) {
      return res.status(404).json({
        error: 'No DICOM files found in ZIP',
        fileId
      });
    }

    // 4. Construir respuesta OHIF
    const series = Array.from(seriesMap.values()).map(s => ({
      ...s,
      SeriesDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      SeriesDescription: `Series ${s.SeriesNumber}`
    }));

    const study = {
      StudyInstanceUID: studyUid,
      StudyDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      StudyTime: new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, ''),
      PatientName: patientName.replace(/\^/g, ' '),
      PatientID: fileId.substring(0, 10),
      PatientSex: '',
      StudyDescription: 'DICOM Study from Google Drive',
      ModalitiesInStudy: Array.from(new Set(series.map(s => s.Modality))).join('\\'),
      StudyID: fileId,
      series
    };

    const response = { studies: [study] };

    // Guardar en caché
    dicomCache.set(fileId, {
      response,
      dicomFiles,
      timestamp: Date.now()
    });

    // Limpiar caché después de 1 hora
    setTimeout(() => dicomCache.delete(fileId), 60 * 60 * 1000);

    res.json(response);
  } catch (error) {
    console.error('Error extracting DICOMs:', error.message);
    res.status(500).json({ 
      error: 'Failed to extract DICOMs from ZIP', 
      details: error.message 
    });
  }
});

/**
 * GET /api/drive/file/:fileId/dicom/:index
 * Sirve un archivo DICOM individual
 */
router.get('/file/:fileId/dicom/:index', async (req, res) => {
  try {
    const { fileId, index } = req.params;
    const instanceIndex = parseInt(index);

    // Verificar caché
    const cached = dicomCache.get(fileId);
    if (!cached) {
      return res.status(404).json({ 
        error: 'Study not found in cache. Please call /study/:fileId first.' 
      });
    }

    const dicomFile = cached.dicomFiles[instanceIndex];
    if (!dicomFile) {
      return res.status(404).json({ 
        error: `DICOM file at index ${index} not found` 
      });
    }

    console.log(`Serving DICOM ${index} from ${fileId}`);

    // Servir archivo DICOM
    res.set('Content-Type', 'application/dicom');
    res.set('Content-Length', dicomFile.buffer.length);
    res.set('Content-Disposition', `attachment; filename="${dicomFile.fileName}"`);
    res.send(dicomFile.buffer);

  } catch (error) {
    console.error('Error serving DICOM file:', error.message);
    res.status(500).json({ 
      error: 'Failed to serve DICOM file', 
      details: error.message 
    });
  }
});

/**
 * GET /api/drive/list-drive
 * Lista archivos del Google Drive (proxy)
 */
router.get('/list-drive', async (req, res) => {
  try {
    const response = await axios.get('https://drive.google.com/drive/...', {
      headers: {
        'Authorization': `Bearer ${GOOGLE_DRIVE_API_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error listing drive files:', error.message);
    res.status(500).json({ 
      error: 'Failed to list drive files', 
      details: error.message 
    });
  }
});

module.exports = router;
```

### `.env`

```env
PORT=3000
GOOGLE_DRIVE_API_KEY=your_google_drive_api_key_here
NODE_ENV=production
```

---

## Flujo de Funcionamiento

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  OHIF       │     │  Backend    │     │  Google     │
│  Viewer     │     │  (Node.js)  │     │  Drive      │
│  (Frontend) │     │             │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       │  1. list-drive    │                    │
       │──────────────────>│                    │
       │                   │  2. Get file list  │
       │                   │───────────────────>│
       │                   │                    │
       │  {files: [...]}   │                    │
       │<──────────────────│                    │
       │                   │                    │
       │  3. study/:id     │                    │
       │──────────────────>│                    │
       │                   │  4. Download ZIP   │
       │                   │───────────────────>│
       │                   │                    │
       │                   │  5. Extract DICOMs │
       │                   │     Parse metadata │
       │                   │     Cache files    │
       │                   │                    │
       │  {studies: [...]} │                    │
       │<──────────────────│                    │
       │                   │                    │
       │  6. wadoUrl       │                    │
       │  (for each image) │                    │
       │──────────────────>│                    │
       │                   │  7. Return DICOM   │
       │<──────────────────│                    │
       │                   │                    │
```

---

## Consideraciones de Producción

### 1. Caché
- Usar **Redis** en lugar de caché en memoria
- Implementar LRU (Least Recently Used) para gestión de caché
- Configurar TTL (Time To Live) apropiado

### 2. Manejo de ZIPs Grandes
- Implementar streaming en lugar de cargar todo en memoria
- Usar colas de procesamiento (Bull, Agenda) para ZIPs grandes
- Considerar límites de tamaño máximo

### 3. Seguridad
- Validar que los archivos sean realmente DICOM
- Sanitizar nombres de archivos para evitar path traversal
- Implementar rate limiting
- Usar autenticación para endpoints sensibles

### 4. Monitoreo
- Agregar logs estructurados (Winston, Pino)
- Métricas de rendimiento (tiempo de extracción, tamaño de ZIPs)
- Alertas para fallos de extracción

---

## Testing

### Probar con curl

```bash
# 1. Listar archivos
curl https://dcom-view-server.onrender.com/api/drive/list-drive

# 2. Obtener estudios de un ZIP
curl https://dcom-view-server.onrender.com/api/drive/study/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy

# 3. Obtener un DICOM específico
curl -o image.dcm https://dcom-view-server.onrender.com/api/drive/file/18wZR_WwRDHfs8u6AcQmCWOuKHL0OhFUy/dicom/0
```

---

## Archivos del Proyecto Frontend

| Archivo | Descripción |
|---------|-------------|
| `index.htm` | Punto de entrada principal |
| `drive-viewer.html` | Viewer alternativo (no usado) |
| `drive-adapter.js` | Adapter que conecta OHIF con el API |
| `app-config.js` | Configuración de OHIF Viewer |
| `manifest.json` | PWA manifest |

---

## Próximos Pasos

✅ **COMPLETADO**: Endpoints `/api/drive/study/:fileId`, `/api/drive/file/:fileId/dicom/:index`, `/api/drive/list-drive` integrados en `src/routes/drive-study.ts` y montados en `/api/drive`.

Próximos:
1. [ ] Actualizar frontend `drive-adapter.js` para consumir nuevos endpoints
2. [ ] Probar flujo completo con ZIP real
3. [ ] Implementar caché Redis para producción (actual: Map en memoria con TTL 1h)
4. [ ] Agregar rate limiting y monitoreo

---

**Versión:** 1.0  
**Fecha:** 2026-03-18  
**Autor:** Asistente de Código

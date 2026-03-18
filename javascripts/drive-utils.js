// drive-utils.js - Shared utilities for NUBIX DICOM Viewer
const API_BASE = 'https://dcom-view-server.onrender.com/api/drive';

window.driveUtils = {
  async fetchList() {
    const res = await fetch(`${API_BASE}/list-drive`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("%c [driveUtils]", "color:yellow", res)
    return res.json();
  },
  async fetchStudy(fileId) {
    const res = await fetch(`${API_BASE}/study/${fileId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  generateOHIFUrl(fileId) {
    return `./view/index.html?fileId=${fileId}`;
  },


  generateManifest(study) {
    const patient = study.studies[0];
    return {
      name: `Estudio ${patient.PatientName || 'NUBIX'}`,
      short_name: patient.PatientID,
      icons: [ /* add icons */ ],
      start_url: `./index.html?fileId=${patient.StudyID}`,
      display: 'standalone',
      theme_color: '#36404A'
    };
  },
  copyShareLink(fileId, name) {
    const link = `${window.location.origin}${window.location.pathname}?fileId=${fileId}`;
    navigator.clipboard.writeText(link).then(() => alert(`Link copiado: ${name}`));
  },
  loadViewer(fileId) {
    // For iframe or OHIF config update
    const studyUrl = `${API_BASE}/study/${fileId}`;
    // Update window.config.dataSources[0].configuration.query.study = studyUrl;
    // Or set iframe src
  }
};


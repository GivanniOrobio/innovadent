// OHIF Viewer Configuration - DICOM JSON DataSource
// Backend: https://dcom-view-server.onrender.com/api/drive

window.config = {
  name: "config/default.js",
  routerBasename: "/",
  showStudyList: true,
  showLoadingIndicator: true,
  
  // White labeling
  whiteLabeling: {
    createLogoComponentFn: function (React) {
      return React.createElement(
        "a",
        {
          target: "_self",
          rel: "noopener noreferrer",
          className: "pointer-events-none",
          href: "#",
        },
        React.createElement("img", {
          src: "../view/image/nubix.png",
          className: "w-8 h-8 object-contain",
          alt: "Logo",
        }),
      );
    },
  },

  // Investigational use
  investigationalUseDialog: { option: "never" },
  
  // UI settings
  disableConfirmationPrompts: true,
  showPatientInfo: "disabled",
  activateViewportBeforeInteraction: false,
  useSharedArrayBuffer: "AUTO",
  
  // Extensions y modes
  extensions: [],
  modes: [],
  customizationService: {},
  
  // Performance
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: false,
  experimentalStudyBrowserSort: false,
  strictZSpacingForVolumeViewport: true,
  groupEnabledModesFirst: true,
  allowMultiSelectExport: true,
  
  // Study prefetcher
  maxNumRequests: { interaction: 100, thumbnail: 1, prefetch: 17 },
  studyPrefetcher: {
    enabled: true,
    displaySetsCount: 2,
    maxNumPrefetchRequests: 5,
    order: "closest"
  },

  // Default data source
  defaultDataSourceName: "dicomjson",
  
  // Data Sources configuration
  dataSources: [
    {
      namespace: "@ohif/extension-default.dataSourcesModule.dicomjson",
      sourceName: "dicomjson",
      configuration: {
        friendlyName: "DICOM JSON - Google Drive",
        name: "dicomjson",
        url: "https://dcom-view-server.onrender.com/api/drive",
        // Headers opcionales
        headers: {
          "Content-Type": "application/json"
        },
        // Método para obtener estudios desde el endpoint /list-drive
        query: {
          study: "/list-drive"
        }
      }
    }
  ],

  // HTTP error handler
  httpErrorHandler: (error) => {
    console.warn('[HTTP Error]', error.status, error.message);
  },

  // Hotkeys
  hotkeys: [
    { commandName: "incrementActiveViewport", label: "Next Viewport", keys: ["right"] },
    { commandName: "decrementActiveViewport", label: "Previous Viewport", keys: ["left"] },
    { commandName: "rotateViewportCW", label: "Rotate Right", keys: ["r"] },
    { commandName: "rotateViewportCCW", label: "Rotate Left", keys: ["l"] },
    { commandName: "invertViewport", label: "Invert", keys: ["i"] },
    { commandName: "flipViewportHorizontal", label: "Flip Horizontally", keys: ["h"] },
    { commandName: "flipViewportVertical", label: "Flip Vertically", keys: ["v"] },
    { commandName: "scaleUpViewport", label: "Zoom In", keys: ["+"] },
    { commandName: "scaleDownViewport", label: "Zoom Out", keys: ["-"] },
    { commandName: "fitViewportToWindow", label: "Zoom to Fit", keys: ["="] },
    { commandName: "resetViewport", label: "Reset", keys: ["space"] },
    { commandName: "nextImage", label: "Next Image", keys: ["down"] },
    { commandName: "previousImage", label: "Previous Image", keys: ["up"] },
    { commandName: "previousViewportDisplaySet", label: "Previous Series", keys: ["pagedown"] },
    { commandName: "nextViewportDisplaySet", label: "Next Series", keys: ["pageup"] },
    { commandName: "setToolActive", commandOptions: { toolName: "Zoom" }, label: "Zoom", keys: ["z"] },
    { commandName: "windowLevelPreset1", label: "W/L Preset 1", keys: ["1"] },
    { commandName: "windowLevelPreset2", label: "W/L Preset 2", keys: ["2"] },
    { commandName: "windowLevelPreset3", label: "W/L Preset 3", keys: ["3"] },
    { commandName: "windowLevelPreset4", label: "W/L Preset 4", keys: ["4"] },
    { commandName: "windowLevelPreset5", label: "W/L Preset 5", keys: ["5"] },
    { commandName: "windowLevelPreset6", label: "W/L Preset 6", keys: ["6"] },
    { commandName: "windowLevelPreset7", label: "W/L Preset 7", keys: ["7"] },
    { commandName: "windowLevelPreset8", label: "W/L Preset 8", keys: ["8"] },
    { commandName: "windowLevelPreset9", label: "W/L Preset 9", keys: ["9"] }
  ],

  // Tours
  tours: [
    {
      id: "mobileSidePanelTour",
      route: "/viewer",
      steps: [
        {
          id: "openSidePanelStep",
          title: "Ver más imágenes o series",
          text: "Pulse la flecha para abrir o cerrar el panel lateral y poder seleccionar otra imagen o serie.",
          attachTo: {
            element: '[data-cy="side-panel-header-left"]',
            on: "right"
          },
          advanceOn: {
            selector: '[data-cy="side-panel-header-left"]',
            event: "click"
          },
          beforeShowPromise: () =>
            new Promise((resolve, reject) => {
              const checkElement = () => {
                const element = document.querySelector('[data-cy="side-panel-header-left"]');
                if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  window.innerWidth <= 768 ? setTimeout(resolve, 500) : resolve();
                } else {
                  setTimeout(checkElement, 200);
                }
              };
              checkElement();
            })
        }
      ],
      tourOptions: {
        useModalOverlay: true,
        defaultStepOptions: {
          buttons: [
            {
              text: "Cerrar",
              action() {
                this.complete();
              },
              secondary: true
            }
          ]
        }
      }
    }
  ]
};

// Log configuration loaded
console.log('[OHIF Config] Configuration loaded successfully');
console.log('[OHIF Config] API Base: https://dcom-view-server.onrender.com/api/drive/list-drive');

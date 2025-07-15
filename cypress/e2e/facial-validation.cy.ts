// cypress/e2e/facial-validation.cy.ts

// Describe es una suite de pruebas, agrupa tests relacionados.
describe('Facial Validation Page E2E Tests', () => {
  // beforeEach se ejecuta antes de cada test (it) en esta suite.
  beforeEach(() => {
    // Visita la URL de tu aplicación.
    // Asegúrate de que tu aplicación de Next.js esté corriendo (npm run dev o yarn dev)
    // Cypress usará el 'baseUrl' configurado en cypress.config.ts
    cy.visit('/facial-validation-screen');
  });

  it('should display the title of the facial validation screen', () => {
    // Usando el atributo data-cy para seleccionar el título
    cy.get('[data-cy="validation-title"]').should('be.visible').and('contain', 'Validación de Acceso Facial');
  });

  it('should display the camera feed', () => {
    // Usando el atributo data-cy para seleccionar el feed de la webcam
    cy.get('[data-cy="webcam-feed"]').should('be.visible');
  });

  it('should display the zone selection dropdown', () => {
    // Usando el atributo data-cy para seleccionar el dropdown de zona
    cy.get('[data-cy="zone-select"]').should('be.visible');
  });

  it('should display loading messages initially', () => {
    // Verifica que los mensajes de carga de modelos y zonas sean visibles inicialmente
    cy.get('[data-cy="loading-models-message"]').should('be.visible');
    cy.get('[data-cy="loading-zones-message"]').should('be.visible');
  });

  it('should hide loading messages and enable controls after models and zones are loaded', () => {
    // Espera a que los mensajes de carga desaparezcan
    cy.get('[data-cy="loading-models-message"]').should('not.exist');
    cy.get('[data-cy="loading-zones-message"]').should('not.exist');

    // Verifica que el selector de zona esté habilitado y tenga al menos una opción real (más allá de la deshabilitada)
    cy.get('[data-cy="zone-select"]')
      .should('not.be.disabled')
      .find('option:not([disabled])') // Busca opciones que no estén deshabilitadas
      .its('length')
      .should('be.gt', 0); // Debe haber al menos una opción real

    // Usa invoke('val') y un regex para verificar que el valor es un UUID válido
    cy.get('[data-cy="zone-select"]')
      .invoke('val')
      .should('match', /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

    // Verifica que el botón de captura esté habilitado (asumiendo modo manual por defecto y zona seleccionada)
    cy.get('[data-cy="capture-button"]').should('not.be.disabled');
  });

  it('should allow selecting a different zone', () => {
    // Espera a que las zonas carguen
    cy.get('[data-cy="loading-zones-message"]').should('not.exist');
    // Selecciona la segunda opción real en el dropdown (índice 1, asumiendo que la 0 es la deshabilitada)
    cy.get('[data-cy="zone-select"]').select(1);
    // Verifica que el valor del selector haya cambiado y que no sea el valor vacío inicial
    cy.get('[data-cy="zone-select"]').invoke('val').should('not.be.empty');
  });

  it('should switch to automatic mode and display camera not ready message', () => {
    // Espera a que los modelos y zonas carguen
    cy.get('[data-cy="loading-models-message"]').should('not.exist');
    cy.get('[data-cy="loading-zones-message"]').should('not.exist');

    // Selecciona el radio button de modo automático
    cy.get('[data-cy="automatic-mode-radio"]').check();

    // Verifica que el botón de captura manual esté oculto
    cy.get('[data-cy="capture-button"]').should('not.be.visible');

    // Espera el mensaje "Cámara no lista..." que tu aplicación realmente muestra
    cy.get('[data-cy="validation-message"]').should('be.visible').and('include.text', 'Cámara no lista para modo automático. Asegúrese de los permisos.');
  });

  // NUEVA SUITE DE TESTS PARA INTERACCIÓN CON CÁMARA (MOCKEADA)
  describe('Facial Validation with Mocked Camera', () => {
    beforeEach(() => {
      // Mockear navigator.mediaDevices.getUserMedia para simular una cámara lista
      cy.visit('/facial-validation-screen', {
        onBeforeLoad(win) {
          cy.stub(win.navigator.mediaDevices, 'getUserMedia').callsFake((constraints) => {
            const mockMediaStream = {
              getTracks: () => [{ stop: () => {} }],
            };
            return Promise.resolve(mockMediaStream);
          });

          // Mockear enumerateDevices si tu app lo usa para seleccionar cámaras
          cy.stub(win.navigator.mediaDevices, 'enumerateDevices').resolves([
            { deviceId: 'mock-camera-1', kind: 'videoinput', label: 'Mock Camera 1' },
            { deviceId: 'mock-camera-2', kind: 'videoinput', label: 'Mock Camera 2' },
          ]);
        },
      });

      // Esperar a que los modelos de Face-API.js y las zonas carguen
      cy.get('[data-cy="loading-models-message"]').should('not.exist');
      cy.get('[data-cy="loading-zones-message"]').should('not.exist');
      // Asegurarse de que el botón de captura esté habilitado (modo manual por defecto)
      cy.get('[data-cy="capture-button"]').should('not.be.disabled');
    });

    it('should show "Ocurrió un error durante la captura." when manually capturing with mocked camera', () => {
      // CAMBIO: Nombre del test más descriptivo
      // Seleccionar una zona válida (la primera real, que es el índice 1)
      cy.get('[data-cy="zone-select"]').select(1);

      // Hacer clic en el botón de captura
      cy.get('[data-cy="capture-button"]').click();

      // CAMBIO CLAVE: Esperar el mensaje de error de captura
      cy.get('[data-cy="validation-message"]').should('be.visible').and('include.text', 'Ocurrió un error durante la captura.');
    });

    // Próximamente: Mocking de la Edge Function para probar flujos de validación exitosos
  });
});

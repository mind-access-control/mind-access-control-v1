import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    // Añade esta línea si tu aplicación no corre en http://localhost:3000
    // Reemplaza el puerto si es necesario
    baseUrl: 'http://localhost:3000', // <-- Asegúrate de que esta sea la URL base de tu aplicación
  },
});

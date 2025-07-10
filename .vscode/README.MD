# Extensiones de VS Code Recomendadas

Este documento lista las extensiones de Visual Studio Code que utilizo y recomiendo para una experiencia de desarrollo consistente.

## Cómo Instalar las Extensiones

Puedes instalar estas extensiones de dos maneras:

### Opción 1: Instalar desde la Vista de Extensiones de VS Code

1. Abre Visual Studio Code.
2. Ve a la vista de **Extensiones** (`Ctrl + Shift + X` o haz clic en el icono de Extensiones en la barra lateral izquierda).
3. Copia el "ID de la Extensión" de la lista de abajo (ej. `dbaeumer.vscode-eslint`).
4. Pégalo en la barra de búsqueda de la vista de Extensiones.
5. Haz clic en el botón "Instalar" que aparece junto a la extensión.

### Opción 2: Instalar desde la Línea de Comandos (Más Rápido para Múltiples)

1. Abre la terminal de tu sistema (PowerShell en Windows, Terminal en macOS/Linux).
2. Asegúrate de que `code` esté en tu PATH (si no lo está, puedes necesitar navegar a la ubicación de instalación de VS Code, por ejemplo, `C:\Users\TuUsuario\AppData\Local\Programs\Microsoft VS Code\bin` en Windows).
3. Ejecuta el siguiente comando para cada extensión, reemplazando `<ID_DE_EXTENSION>` con el ID correspondiente de la lista:

   ```bash
   code --install-extension <ID_DE_EXTENSION>
   ```

   Por ejemplo:
   ```bash
   code --install-extension dbaeumer.vscode-eslint
   ```

## Lista de Extensiones

Aquí están las extensiones y sus enlaces directos al Marketplace:

* **ESLint**

  * ID: `dbaeumer.vscode-eslint`
  * Descripción: Integra ESLint en VS Code.
  * Enlace: [ESLint en Marketplace](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* **Auto Rename Tag**

  * ID: `formulahendry.auto-rename-tag`
  * Descripción: Renombra automáticamente la etiqueta HTML/XML emparejada.
  * Enlace: [Auto Rename Tag en Marketplace](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-rename-tag)
* **Auto Close Tag**

  * ID: `formulahendry.auto-close-tag`
  * Descripción: Cierra automáticamente las etiquetas HTML/XML.
  * Enlace: [Auto Close Tag en Marketplace](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-close-tag)
* **Todo Highlight**

  * ID: `wayou.vscode-todo-highlight`
  * Descripción: Resalta las anotaciones TODO, FIXME, etc. en tu código.
  * Enlace: [Todo Highlight en Marketplace](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight)
* **Terminal (formulahendry)**

  * ID: `formulahendry.terminal`
  * Descripción: (Esta extensión no tiene una descripción clara en el JSON, pero su nombre sugiere funcionalidades relacionadas con la terminal).
  * Enlace: [Terminal en Marketplace](https://marketplace.visualstudio.com/items?itemName=formulahendry.terminal)
* **Better Comments**

  * ID: `aaron-bond.better-comments`
  * Descripción: Mejora tus comentarios de código anotándolos con alertas, información, TODOs, etc.
  * Enlace: [Better Comments en Marketplace](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
* **Prettier - Code formatter**

  * ID: `esbenp.prettier-vscode`
  * Descripción: Formateador de código para VS Code.
  * Enlace: [Prettier en Marketplace](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
* **Color Highlight**

  * ID: `naumovs.color-highlight`
  * Descripción: Resalta los códigos de color en tu editor.
  * Enlace: [Color Highlight en Marketplace](https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight)
* **ES7 React/Redux/GraphQL/React-Native snippets**

  * ID: `dsznajder.es7-react-js-snippets`
  * Descripción: Proporciona fragmentos de código para ES7, React, Redux, GraphQL y React-Native.
  * Enlace: [ES7 React/Redux/GraphQL/React-Native snippets en Marketplace](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)
* **Omegasheets for VS Code**

  * ID: `reporting-cz.omegasheets-vscode`
  * Descripción: (Esta extensión no tiene una descripción clara en el JSON, pero su nombre sugiere funcionalidad con hojas de cálculo).
  * Enlace: [Omegasheets for VS Code en Marketplace](https://marketplace.visualstudio.com/items?itemName=reporting-cz.omegasheets-vscode)
* **Activitus Bar**

  * ID: `gruntfuggly.activitusbar`
  * Descripción: Guarda espacio en pantalla recreando los botones de la barra de actividad.
  * Enlace: [Activitus Bar en Marketplace](https://marketplace.visualstudio.com/items?itemName=gruntfuggly.activitusbar)
* **Live Server**

  * ID: `ritwickdey.liveserver`
  * Descripción: Lanza un servidor de desarrollo local con recarga en vivo para páginas estáticas y dinámicas.
  * Enlace: [Live Server en Marketplace](https://marketplace.visualstudio.com/items?itemName=ritwickdey.liveserver)
* **Error Lens**

  * ID: `usernamehw.errorlens`
  * Descripción: Mejora el resaltado de errores, advertencias y otros diagnósticos de lenguaje.
  * Enlace: [Error Lens en Marketplace](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
* **VSCode Office**

  * ID: `cweijan.vscode-office`
  * Descripción: (Esta extensión no tiene una descripción clara en el JSON, pero su nombre sugiere integración con documentos de Office).
  * Enlace: [VSCode Office en Marketplace](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-office)
* **VSCode Great Icons**

  * ID: `vscode-icons-team.vscode-icons`
  * Descripción: Un paquete de iconos para VS Code.
  * Enlace: [VSCode Great Icons en Marketplace](https://marketplace.visualstudio.com/items?itemName=vscode-icons-team.vscode-icons)
* **Deno**

  * ID: `denoland.vscode-deno`
  * Descripción: Un servidor de lenguaje cliente para Deno.
  * Enlace: [Deno en Marketplace](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)
* **Material Icon Theme**

  * ID: `pkief.material-icon-theme`
  * Descripción: Un tema de iconos de Material Design para VS Code.
  * Enlace: [Material Icon Theme en Marketplace](https://marketplace.visualstudio.com/items?itemName=pkief.material-icon-theme)
* **GitHub Copilot Chat**

  * ID: `github.copilot-chat`
  * Descripción: Funciones de chat de IA impulsadas por Copilot.
  * Enlace: [GitHub Copilot Chat en Marketplace](https://marketplace.visualstudio.com/items?itemName=github.copilot-chat)
* **CodeSnap**

  * ID: `adpyke.codesnap`
  * Descripción: Toma capturas de pantalla hermosas de tu código.
  * Enlace: [CodeSnap en Marketplace](https://marketplace.visualstudio.com/items?itemName=adpyke.codesnap)
* **GitHub Copilot**

  * ID: `github.copilot`
  * Descripción: Tu programador de pares con IA.
  * Enlace: [GitHub Copilot en Marketplace](https://marketplace.visualstudio.com/items?itemName=github.copilot)

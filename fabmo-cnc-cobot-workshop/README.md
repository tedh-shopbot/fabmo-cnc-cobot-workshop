### Project Structure

```
fabmo-cnc-cobot-workshop/
│
├── README.md
├── package.json
├── package-lock.json
├── server.js
├── engine.js
├── config/
│   ├── default.json
│   └── profiles/
│       ├── drillpress.json
│       ├── ripsaw.json
│       └── chopsaw.json
├── dashboard/
│   ├── index.html
│   ├── css/
│   │   ├── styles.css
│   ├── js/
│   │   ├── fabmo.js
│   │   ├── drillpress.js
│   │   ├── ripsaw.js
│   │   └── chopsaw.js
│   └── images/
│       ├── drillpress.png
│       ├── ripsaw.png
│       └── chopsaw.png
├── routes/
│   ├── index.js
│   ├── drillpress.js
│   ├── ripsaw.js
│   └── chopsaw.js
└── db/
    ├── jobs.js
    └── files.js
```

### Step-by-Step Setup

1. **Initialize the Project**:
   - Create a new directory for the project and navigate into it.
   - Run `npm init -y` to create a `package.json` file.

2. **Install Dependencies**:
   - Install necessary packages such as Express, Socket.IO, and any other dependencies required for the FabMo framework.
   ```bash
   npm install express socket.io restify
   ```

3. **Create Configuration Files**:
   - In the `config/` directory, create a `default.json` file for general settings and individual JSON files for each tool profile (drillpress, ripsaw, chopsaw).

4. **Develop the Dashboard**:
   - In the `dashboard/` directory, create an `index.html` file that serves as the main interface for the applets.
   - Create CSS files for styling and JavaScript files for each tool's functionality.
   - Use images to represent each tool visually.

5. **Implement Tool Functionality**:
   - In the `js/` directory, create separate JavaScript files for each tool (e.g., `drillpress.js`, `ripsaw.js`, `chopsaw.js`).
   - Each file should handle the specific logic for the tool, including event listeners, status updates, and job submissions.

6. **Set Up Routes**:
   - In the `routes/` directory, create route files for each tool that handle API requests and responses.
   - Implement endpoints for starting jobs, stopping jobs, and retrieving tool status.

7. **Database Integration**:
   - In the `db/` directory, create files to manage job and file metadata.
   - Use a simple database like TingoDB or any other suitable database to store job history and file information.

8. **Server Setup**:
   - In `server.js`, set up the Express server and configure Socket.IO for real-time communication.
   - Load the routes and serve the dashboard.

9. **Testing and Debugging**:
   - Run the application in debug mode to test the functionality of each tool.
   - Ensure that the dashboard updates correctly based on tool status and user interactions.

10. **Documentation**:
    - Create a `README.md` file to document the project, including setup instructions, usage, and any other relevant information.

### Example Code Snippets

**server.js**:
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes/index');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('dashboard'));
app.use('/api', routes);

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
```

**drillpress.js**:
```javascript
// drillpress.js
document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('start-drillpress');
    startButton.addEventListener('click', function() {
        // Logic to start the drill press job
        fabmo.submitJob({ /* job details */ });
    });
});
```

### Conclusion

This project structure and setup will allow you to create a series of mini-applications for the FabMo CNC Cobot Workshop. Each tool will have its own dedicated functionality while sharing a common framework for easy integration and management. As you develop each applet, you can expand the functionality and improve the user interface based on user feedback and testing.

# fabmo-cobot-workshop-app
App to give a familiar interface to CNC for common tasks. Make your CNC tool a
helpful cobot while learning CNC production principles. Use the cobot tools as
building blocks for fully integrating CNC and robotics into your workflow.

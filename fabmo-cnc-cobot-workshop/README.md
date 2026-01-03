# FabMo CNC Cobot Workshop

A collection of intuitive, tool-based mini-applications for CNC operations that make using a CNC machine as familiar as using traditional workshop tools.

## 🎯 Project Vision

The CNC Cobot Workshop aims to lower the barrier to entry for CNC machining by providing apps that emulate familiar workshop tools like drill presses, saws, and other common equipment. Rather than requiring users to go through the full CAD/CAM workflow for simple tasks, these apps provide intuitive interfaces that let users quickly perform common operations.

## 📦 What's Included

### Current Apps

- **Drill Press** - Drill precise holes, arrays, and patterns
  - Single holes or arrays
  - Circular and custom patterns
  - Through holes, pockets, and counterbores
  - Interactive visual placement

### Planned Apps

- **Rip Saw** - Make long cuts across sheet materials
- **Chop Saw** - Crosscuts and miters on long boards
- **Surfacer** - Surface full tables or material slabs
- **V-Carve** - Text and decorative carving
- And more...

## 🚀 Getting Started

### For Users

1. Download the `.fma` file for the app you want
2. Load it into your FabMo system
3. Open the app and start using it!

### For Developers

```bash
# Clone the repository
git clone https://github.com/FabMo/fabmo-cnc-cobot-workshop.git
cd fabmo-cnc-cobot-workshop/fabmo-cnc-cobot-workshop

# Install dependencies
npm install

# Build a specific app
npm run build:drill

# Build all apps
npm run build:all

# Serve locally for testing
npm run serve


### Conclusion

This project structure and setup will allow you to create a series of mini-applications for the FabMo CNC Cobot Workshop. Each tool will have its own dedicated functionality while sharing a common framework for easy integration and management. As you develop each applet, you can expand the functionality and improve the user interface based on user feedback and testing.

# fabmo-cobot-workshop-app
App to give a familiar interface to CNC for common tasks. Make your CNC tool a
helpful cobot while learning CNC production principles. Use the cobot tools as
building blocks for fully integrating CNC and robotics into your workflow.

fabmo-cnc-cobot-workshop/
├── apps/               # Individual mini-apps
│   ├── drill-press/
│   ├── rip-saw/
│   └── chop-saw/
├── shared/            # Common resources
│   ├── js/           # Shared JavaScript (cobot-core.js, fabmo.js)
│   └── css/          # Common styles
├── build/            # Built .fma files (generated)
└── docs/             # Documentation


🔧 Development
Creating a New App
Create a new folder in apps/
Use the standard structure:

your-app/
├── index.html
├── package.json
├── css/
│   └── your-app.css
└── js/
    ├── main.js
    ├── ui.js
    └── toolpath.js


Initialize CobotCore in your main.js
Add to build.js APPS object
Build with node build.js your-app
Code Standards
Use ES6+ JavaScript
Follow existing naming conventions
Document all public methods
Include validation and error handling
Use the shared CSS variables and classes

📚 Documentation
Workshop Guide - Complete user guide
API Reference - FabMo API docs
OpenSBP Language - Toolpath language reference

🤝 Contributing
We welcome contributions! Whether it's:

New mini-app ideas
Bug fixes
Documentation improvements
UI/UX enhancements
Please open an issue or submit a pull request.

📄 License
Apache License 2.0 - see LICENSE file for details

🔗 Related Projects
FabMo Engine - Main FabMo server
FabMo G2-Core - Motion control firmware
FabMo Apps - Other FabMo applications
💬 Support
Documentation: http://www.gofabmo.org
GitHub Issues: Report a bug
Community: FabMo Forums



# ![Song Clock](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/songclock-logo-dark-ZJjlWcJSEynWrFNMGu22pRUZcFNgAM.png)

**[Try it live at songclock.app →](https://songclock.app)**

## Overview

Song Clock is an innovative web application that transforms time into music, allowing users to "hear" the current time through musical intervals and patterns. This unique approach to timekeeping serves multiple purposes:

- **Ear Training for Musicians**: Practice recognizing musical intervals in a practical context
- **Accessible Timekeeping**: Provide an auditory representation of time for those with visual impairments
- **Music Education**: Learn about musical intervals and their relationships
- **Mindfulness**: Experience time in a new, more engaging way

## Features

- **Musical Time Representation**: Hours, minutes, and seconds are represented by distinct musical patterns
- **Interactive Visualization**: Visual representation of time through an analog clock and musical notation
- **Customizable Sound Settings**: Adjust volume levels for different time components
- **Manual Time Control**: Set specific times to practice hearing different intervals
- **Responsive Design**: Works on desktop and mobile devices
- **Keyboard Shortcuts**: Quick access to main functions
- **Accessibility**: Designed with screen reader support and WCAG compliance

## Technology Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Music Notation**: VexFlow
- **Audio**: Web Audio API
- **Analytics**: Google Analytics

## Development Environment Setup

### Prerequisites

- Node.js (v18 or later)
- npm (v8 or later) or yarn (v1.22 or later)
- Git

### Installation

1. Clone the repository:
\`\`\`
git clone https://github.com/yourusername/songclock.git
cd songclock
\`\`\`

2. Install dependencies:
\`\`\`
npm install
# or
yarn install
\`\`\`

3. Start the development server:

\`\`\`
npm run dev
# or
yarn dev
\`\`\`

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables (if needed):

\`\`\`
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-YNK87PBY80
\`\`\`

## Build and Deployment

### Building for Production

\`\`\`
npm run build
# or
yarn build
\`\`\`

### Running the Production Build Locally

\`\`\`
npm run start
# or
yarn start
\`\`\`

### Deployment

The application is optimized for deployment on Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Configure environment variables if needed
4. Deploy

For other platforms, follow their respective deployment guides for Next.js applications.

## Project Structure

\`\`\`
songclock/
├── app/                  # Next.js app directory
│   ├── layout.tsx        # Root layout component
│   ├── page.tsx          # Main application page
│   └── providers.tsx     # Context providers
├── components/           # React components
│   ├── analog-clock.tsx  # Analog clock visualization
│   ├── audio-engine.tsx  # Audio generation system
│   ├── musical-staff.tsx # Musical notation display
│   └── ...               # Other components
├── public/               # Static assets
│   └── images/           # Image assets
├── utils/                # Utility functions
│   └── analytics.ts      # Analytics tracking
└── ...                   # Configuration files
\`\`\`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [VexFlow](https://github.com/0xfe/vexflow) for music notation rendering
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for audio synthesis
- [Next.js](https://nextjs.org/) for the application framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
* [v0](https://v0.dev) for AI-assisted development
- [Vercel](https://vercel.com/) for hosting and deployment

---

Developed by [Pedal Point Solutions](https://pedalpoint.com)

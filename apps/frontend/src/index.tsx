import ReactDOM from 'react-dom/client';
import '@fontsource/roboto';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://9acf76e6b4d4bc9f51669d6366cf1307@o4511298353496064.ingest.de.sentry.io/4511387097104464",
  sendDefaultPii: true,
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <Sentry.ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Sentry.ErrorBoundary>,
);

import { configProblems } from './config';
import { AppShell } from './shell/app-shell';
import { ConfigProblems } from './shell/config-problems';

function App() {
  if (configProblems.length > 0) return <ConfigProblems problems={configProblems} />;
  return <AppShell />;
}

export default App;

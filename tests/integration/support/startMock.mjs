// Starts the kit's mock on a free port with its own state file and prints the port on stdout.
// Run as a separate process: the mock is an ES module, Jest does not import it.
import {createMockServer} from '../../../mobile-engineer-candidate-kit/mock-server.mjs';

const [statePath] = process.argv.slice(2);
const server = createMockServer({statePath});
server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`MOCK_PORT=${server.address().port}\n`);
});

import React from 'react';
import {Provider} from 'react-redux';
import {AppRoot} from './src/app/AppRoot';
import {store} from './src/state/store';

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AppRoot />
    </Provider>
  );
}

export default App;

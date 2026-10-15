import { useState } from 'react';
import ChatScreen from './components/ChatScreen';
import LoginForm from './components/LoginForm';
import { clearCredentials, loadCredentials, saveCredentials } from './storage';
import type { Credentials } from './types';

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => loadCredentials());
  const [notice, setNotice] = useState('');

  if (!creds) {
    return (
      <LoginForm
        notice={notice}
        onLogin={(next, remember) => {
          saveCredentials(next, remember);
          setNotice('');
          setCreds(next);
        }}
      />
    );
  }

  return (
    <ChatScreen
      key={creds.idInstance}
      creds={creds}
      onLogout={(message) => {
        clearCredentials();
        setNotice(message ?? '');
        setCreds(null);
      }}
    />
  );
}

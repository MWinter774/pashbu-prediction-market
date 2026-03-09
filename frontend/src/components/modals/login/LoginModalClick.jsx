import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import { useAuth } from '../../../helpers/AuthContent';
import { useHistory, useLocation } from 'react-router-dom';
import { LoginSVG } from '../../../assets/components/SvgIcons';

const LoginModalButton = ({ iconOnly = false }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { login } = useAuth();
  const [redirectAfterLogin, setRedirectAfterLogin] = useState('/');
  const history = useHistory();
  const location = useLocation();

  // Auto-open login modal when ?showLogin=true is in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('showLogin') === 'true') {
      setIsLoginModalOpen(true);
      setRedirectAfterLogin('/');
      history.replace('/');
    }
  }, [location.search, history]);

  const handleOpenModal = () => {
    setRedirectAfterLogin(history.location.pathname);
    setIsLoginModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="text-sm font-medium text-white hover:text-gray-300 transition-colors px-2 py-1.5"
      >
        Log In
      </button>
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
          redirectAfterLogin={redirectAfterLogin}
        />
      )}
    </>
  );
};

export default LoginModalButton;

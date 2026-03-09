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
        className={`flex gap-3 items-center p-2 text-gray-300 rounded-lg hover:bg-gray-700 group transition-colors duration-200 ${
          iconOnly ? 'justify-center' : ''
        }`}
      >
        <LoginSVG
          className={`w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-200 ${
            iconOnly ? '' : 'mr-3'
          }`}
        />
        {!iconOnly && <span className='text-sm'>Login</span>}
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

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Login.module.scss';
import { LoginForm } from '../../components/Login/LoginForm';

export const Login: React.FC = () => {
  return (
    <div className={styles.login}>
      <header className={styles.header}>
        <h1>Tervetuloa täyttöpaikalle!</h1>
        <p>
          Täyttöpaikka on Tampereen Urheilusukeltajien uusi, digitaalinen
          täyttöpäiväkirja. Järjestelmää kehitetään vapaaehtoisvoimin ja sen
          lähdekoodi on saatavilla vapaasti{' '}
          <a href="https://github.com/Tampereen-Urheilusukeltajat/Tayttopaikka">
            GitHubissa
          </a>
          .
        </p>
        <p>
          Palautetta ja kehitysehdotuksia voi lähettää osoitteeseen{' '}
          <a href="mailto:palaute@tayttopaikka.fi">palaute@tayttopaikka.fi</a>.
        </p>
      </header>
      <div style={{ width: '220px' }}>
        <LoginForm />
      </div>
      <div>
        <span>
          <Link to={'/register'}>Rekistöröidy käyttäjäksi</Link>
          <br />
          <Link to={'/request-password-reset'}>Unohditko salasanasi?</Link>
        </span>
      </div>
    </div>
  );
};

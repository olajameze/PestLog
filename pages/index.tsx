import type { GetServerSideProps } from 'next';

/** Marketing content lives at [/home](home.tsx). Root always opens sign-in. */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/auth/signin', permanent: false },
});

export default function Index() {
  return null;
}

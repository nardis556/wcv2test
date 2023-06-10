import * as React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import App from 'next/app';

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    return (
      <ChakraProvider>
        <Component {...pageProps} />
      </ChakraProvider>
    );
  }
}

export default MyApp;

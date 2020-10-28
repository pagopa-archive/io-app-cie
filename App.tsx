import { Buffer } from "buffer";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet
} from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";

const App: React.FunctionComponent = () => {
  const [adpuResponse, setADPUResponse] = useState("APDU Response");
  const [detectedTechnology, setDetectedTechnology] = useState("");
  const [nfcUID, setNfcUID] = useState("");
  const [testSuccess, setTestSuccess] = useState(false);
  const [waitingCIE, setWaitingCIE] = useState(false);

  const resetState = () => {
    setADPUResponse("APDU Response");
    setDetectedTechnology("");
    setNfcUID("");
    setTestSuccess(false);
    setWaitingCIE(false);
  };

  const cancelTechRequest = () => {
    NfcManager.cancelTechnologyRequest().catch(() => 0);
  };

  const cleanUp = () => {
    // Do the cleanings in any case
    cancelTechRequest();
    // Reset state
    resetState();
  };

  useEffect(() => {
    NfcManager.start().catch(error => {
      cancelTechRequest();
      alert(error);
    });
    // Do the cleanings after rendering only if the app is not waiting for CIE
    return () => {
      if (!waitingCIE) {
        cancelTechRequest();
      }
    };
  });

  const test = async () => {
    try {
      const tech = NfcTech.IsoDep;
      setWaitingCIE(true);
      const resp = await NfcManager.requestTechnology(tech, {
        alertMessage: "Ready to send some APDU"
      });

      // the NFC uid can be found in tag.id
      const tag = await NfcManager.getTag();

      setDetectedTechnology(resp);
      setNfcUID(tag.id);

      // Test Case 7816_A_1
      // Send the following SelectApplication APDU to the e-Passport.
      // ‘00 A4 04 0C 07 A0 00 00 02 47 10 01'
      // According to the ICAO recommendation, the P2 denotes "return no file
      // information", and there is no Le byte present. Therefore, the response
      // data field MUST be empty. The e-Passport MUST return status bytes
      // ‘90 00’.

      const command = [
        0x00,
        0xa4,
        0x04,
        0x0c,
        0x07,
        0xa0,
        0x00,
        0x00,
        0x02,
        0x47,
        0x10,
        0x01
      ];

      const apduAnswer = await Platform.select({
        default: async () => await NfcManager.transceive(command),
        ios: async () => {
          const { response } = await NfcManager.sendCommandAPDUIOS(command);
          return response;
        }
      })();
      const humanReadableResponse = Buffer.from(apduAnswer).toString("hex");

      setADPUResponse(humanReadableResponse);
      setTestSuccess(humanReadableResponse === "9000");
      setWaitingCIE(false);
    } catch (exception) {
      alert(exception);
    }
  };

  return (
    <View style={[styles.mainView]}>
      <Text style={[styles.textLabel]}>NFC APDU Protocol Protocol Demo</Text>
      <Text style={[styles.textNormal]}>
        This utility runs ICAO Test Case 7816_A_1, which consists in sending the
        APDU message 0x00A4040C07A0000002471001 to the CIE and waiting back for
        the reply 0x9000.
      </Text>

      <TouchableOpacity style={[styles.primaryButton]} onPress={test}>
        <Text>RUN ICAO TEST CASE 7816_A_1</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.primaryButton]} onPress={cleanUp}>
        <Text>CANCEL TEST</Text>
      </TouchableOpacity>

      {waitingCIE && (
        <Text style={[styles.textWarning]}>
          Please move the CIE near the mobile phone!
        </Text>
      )}

      <Text style={[styles.textLabel]}>ICAO Test Case 7816_A_1 results:</Text>

      <Text style={[styles.textNormal]}>Technology: {detectedTechnology}</Text>

      <Text style={[styles.textNormal]}>NFC UID: {nfcUID}</Text>

      <View
        style={[styles.textBox, testSuccess ? styles.success : styles.error]}
      >
        <Text>{adpuResponse}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainView: {
    padding: 20
  },
  textBox: {
    padding: 10,
    width: 250,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1
  },
  primaryButton: {
    padding: 10,
    width: 250,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: "cyan"
  },
  textLabel: {
    padding: 10,
    marginTop: 10,
    marginBottom: 20,
    fontWeight: "bold"
  },
  textNormal: {
    padding: 0,
    marginLeft: 20
  },
  textWarning: {
    padding: 0,
    marginLeft: 20,
    fontWeight: "bold",
    color: "red"
  },
  success: {
    borderColor: "green"
  },
  error: {
    borderColor: "red"
  }
});

export default App;

import React, { useState, useEffect, useRef } from "react";
import * as FileSystem from "expo-file-system";
import * as FirebaseCore from "expo-firebase-core";
import firebase from "firebase";
import Toast from "react-native-simple-toast";
import {
  View,
  StyleSheet,
  Text,
  Button,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  LogBox,
} from "react-native";
import {
  useDeviceOrientation,
  // useCameraRoll,
} from "@react-native-community/hooks";
import {
  CAMERA,
  CAMERA_ROLL,
  AUDIO_RECORDING,
  usePermissions,
} from "expo-permissions";
import { Camera } from "expo-camera";
import { Video } from "expo-av";
import useToggle from "./components/custom_hooks/toggle";

// Ignore firebase caused long timeout warnings
LogBox.ignoreLogs(["Setting a timer"]);

export default function App() {
  const camera = useRef();
  const [record, toggleRecord] = useToggle(false);
  const [openCamera, toggleOpenCamera] = useToggle(false);
  const { landscape } = useDeviceOrientation();
  const appDir = FileSystem.cacheDirectory;
  const [activeVideo, setActiveVideo] = useState("");
  // const [photos, getPhotos, saveToCameraRoll] = useCameraRoll();
  const ensureFileExists = async (path) => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(path);
      if (!dirInfo.exists()) {
        return newUri;
      }
      return false;
    } catch (e) {}
  };
  const [permissions = "", askPermissions, getPermissions] = usePermissions(
    [AUDIO_RECORDING, CAMERA, CAMERA_ROLL],
    { ask: true }
  );

  // ToDo: Debug storage
  const [storage, setStorage] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        await getPermissions();
        if (permissions.status !== "granted") {
          async () => await askPermissions();
        }
      } catch (e) {
        Toast.showWithGravity(
          "You can allow permissions later in settings",
          Toast.LONG,
          Toast.TOP
        );
        Toast.showWithGravity(`permissions error: ${e}`);
      }
    })();

    (async () => {
      try {
        firebase.initializeApp(FirebaseCore.DEFAULT_WEB_APP_OPTIONS);
        setStorage(firebase.storage());
        // readData(false, firebase.storage());
        // setActiveVideo();
      } catch (e) {
        // ToDO: handle firebase init errors
        // Toast.showWithGravity("Welcome", Toast.LONG, Toast.TOP);
        // Toast.showWithGravity(`Download error: ${e}`);
      }
    })();

    return () => {
      permissions.status = "granted";
    };
    // ToDo: implement cleanup method
  }, [permissions.status, storage]);

  const readData = async (video = false, storage) => {
    const storageRef = await storage.ref(`videos/${video}`);
    try {
      if (!video) {
        let list = await storageRef.child("videos/").listAll();
        video = list.items[0];
        if (!video) {
          return;
        }
      }

      storageRef
        .child(`videos/${video}`)
        .getDownloadURL()
        .then(function (url) {
          // This can be downloaded directly:
          var xhr = new XMLHttpRequest();
          xhr.responseType = "blob";
          xhr.onload = function (event) {
            var blob = xhr.response;
          };
          xhr.open("GET", url);
          xhr.send();

          // ToDo: complete download of last video
          // FileSystem.downloadAsync
        });
    } catch (error) {
      // Handle any errors
    }
  };

  const writeData = async (video) => {
    try {
      const storageRef = await storage.ref();
      const vidRef = await storageRef.child(`${video.id}.mp4`);
      // const metadata = { contentType: "video/mp4" };
      await vidRef.putString(video.blob, "raw").then((res) => {
        console.log(res);
        return true;
      });
    } catch (e) {
      console.log("write data error:", e);
      return false;
    }
  };

  const handleClose = async () => {
    if (record) {
      toggleRecord();
      await camera.current.stopRecording();
    }
    toggleOpenCamera();
  };

  const handleRecord = async () => {
    try {
      const { status = null } = await Camera.requestPermissionsAsync();
      if (!record && status === "granted") {
        const options = {
          quality: Camera.Constants.VideoQuality["480p"],
        };

        if (camera) {
          toggleRecord();
          ensureFileExists();
          const data = await camera.current.recordAsync(options);

          if (data.uri) {
            const newUri = appDir + "last.mp4";
            await FileSystem.copyAsync({
              from: data.uri,
              to: newUri,
            });
            const done = ensureFileExists(newUri);
            if (done) {
              const blob = await FileSystem.readAsStringAsync(newUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              if (blob) {
                const newVideo = {
                  id: Date.now(),
                  uri: `${newUri}`,
                  blob: blob,
                };
                Toast.showWithGravity(
                  "Uploading... please wait",
                  Toast.LONG,
                  Toast.CENTER
                );
                setActiveVideo(newVideo.uri);
                await writeData(newVideo);
                Toast.showWithGravity("Video saved", Toast.LONG, Toast.CENTER);
              }
            } else {
              Toast.showWithGravity("Save failed", Toast.LONG, Toast.TOP);
            }
          }
        }
      } else {
        if (camera) {
          await camera.current.stopRecording();
          toggleRecord();
        }
      }
    } catch (e) {
      Toast.show(`Recording error: ${e}`);
    }
  };

  return (
    <View style={styles.container}>
      {openCamera ? (
        <Camera
          ref={camera}
          autoFocus
          style={styles.videoPreview}
          type={Camera.Constants.Type.back}
          ratio={landscape ? "16:9" : "4:3"}
          flashMode={Camera.Constants.FlashMode.off}
        >
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handleRecord}
              style={record ? styles.stopBtn : styles.recBtn}
            >
              <Text style={record ? styles.stopBtnTxt : styles.recBtnTxt}>
                {record ? "STOP" : "REC"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
              <Text style={styles.backBtnTxt}>Back</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      ) : (
        <>
          <View style={styles.title} height={landscape ? "100vh" : "30%"}>
            <Text style={styles.titleText}>Get ready...</Text>
          </View>
          <Button
            title="Record new video"
            style={styles.btn}
            onPress={toggleOpenCamera}
          ></Button>
          {activeVideo !== "" ? (
            <Video
              source={{
                uri: activeVideo,
              }}
              // id={activeVideo.id}
              rate={1.0}
              volume={1.0}
              isMuted={true}
              resizeMode="cover"
              shouldPlay={false}
              isLooping={false}
              useNativeControls
              style={styles.viewer}
            />
          ) : (
            <></>
          )}
        </>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    width: "100%",
  },
  title: {
    marginBottom: "5%",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    backgroundColor: "black",
    width: "100%",
  },
  titleText: {
    color: "white",
    fontSize: 50,
  },
  btn: {
    marginBottom: "5%",
  },
  viewer: {
    flex: 1,
    width: Dimensions.get("screen").width,
    height: 300,
    backgroundColor: "black",
  },
  bodyText: {
    marginTop: 20,
    marginBottom: 20,
  },
  videoPreview: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  controls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  recBtn: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    margin: 20,
  },
  recBtnTxt: {
    color: "red",
  },
  stopBtn: {
    flex: 1,
    backgroundColor: "red",
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    margin: 20,
  },
  stopBtnTxt: {
    color: "#fff",
  },
  backBtn: {
    flex: 0,
    backgroundColor: "dodgerblue",
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 20,
    margin: 20,
  },
  backBtnTxt: {
    color: "#fff",
  },
});

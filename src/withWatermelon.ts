import {
  withXcodeProject,
  withDangerousMod,
  ExportedConfigWithProps,
} from "@expo/config-plugins";
import filesys from "fs";
import path from "path";
import resolveFrom from "resolve-from";
import { insertLinesHelper } from "./insertLinesHelper";

const fs = filesys.promises;

/**
 * Platform: Android
 *  */
function setAndroidMainApplication(config: ExportedConfigWithProps) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const root = config.modRequest.platformProjectRoot;
      const filePath = `${root}/app/src/main/java/${config?.android?.package?.replace(
        /\./g,
        "/"
      )}/MainApplication.java`;

      const contents = await fs.readFile(filePath, "utf-8");

      let updated = insertLinesHelper(
        "import com.nozbe.watermelondb.WatermelonDBPackage;",
        "import java.util.List;",
        contents
      );

      await fs.writeFile(filePath, updated);

      return config;
    },
  ]);
}

/**
 * Platform: iOS
 *  */
function setAppDelegate(config: ExportedConfigWithProps) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const filePath = getPlatformProjectFilePath(config, "AppDelegate.h");
      const contents = await fs.readFile(filePath, "utf-8");

      let updated =
        `#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

// Silence warning
#import "../../node_modules/@nozbe/watermelondb/native/ios/WatermelonDB/SupportingFiles/Bridging.h"\n
            ` + contents;

      await fs.writeFile(filePath, updated);

      return config;
    },
  ]);
}

function setWmelonBridgingHeader(config: ExportedConfigWithProps) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const filePath = getPlatformProjectFilePath(config, "wmelon.swift");
      const contents = `
//
//  water.swift
//  watermelonDB
//
//  Created by Watermelon-plugin on ${new Date().toLocaleDateString()}.
//

import Foundation`;

      await fs.writeFile(filePath, contents);

      return config;
    },
  ]);
}

const withCocoaPods = (config: ExportedConfigWithProps) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      const contents = await fs.readFile(filePath, "utf-8");

      const watermelonPath = isWatermelonDBInstalled(
        config.modRequest.projectRoot
      );

      if (watermelonPath) {
        const patchKey = "post_install";
        const slicedContent = contents.split(patchKey);
        slicedContent[0] += `\n

  # In order to Watermelon work with UseFrameworks (Firebase for example), we need to add this code
  $static_framework = [ 
    'WatermelonDB',
      'simdjson',
  ]
  pre_install do |installer|
    Pod::Installer::Xcode::TargetValidator.send(:define_method, :verify_no_static_framework_transitive_dependencies) {}
      installer.pod_targets.each do |pod|
        if $static_framework.include?(pod.name)
          def pod.build_type;
          Pod::BuildType.static_library # >= 1.9
        end
      end
    end
  end
  #End Watermelon with Firebase Code Add
  
  pod 'WatermelonDB', :path => '../node_modules/@nozbe/watermelondb'
  pod 'React-jsi', :path => '../node_modules/react-native/ReactCommon/jsi', :modular_headers => true
  pod 'simdjson', path: '../node_modules/@nozbe/simdjson'\n\n  `;
        await fs.writeFile(filePath, slicedContent.join(patchKey));
      } else {
        throw new Error("Please make sure you have watermelondb installed");
      }
      return config;
    },
  ]);
};

/**
 * Exclude building for arm64 on simulator devices in the pbxproj project.
 * Without this, production builds targeting simulators will fail.
 */
// @ts-ignore
function setExcludedArchitectures(project) {
  const configurations = project.pbxXCBuildConfigurationSection();
  // @ts-ignore
  for (const { buildSettings } of Object.values(configurations || {})) {
    // Guessing that this is the best way to emulate Xcode.
    // Using `project.addToBuildSettings` modifies too many targets.
    if (
      typeof (buildSettings === null || buildSettings === void 0
        ? void 0
        : buildSettings.PRODUCT_NAME) !== "undefined"
    ) {
      buildSettings['"EXCLUDED_ARCHS[sdk=iphonesimulator*]"'] = '"arm64"';
    }
  }

  return project;
}

const withExcludedSimulatorArchitectures = (c: ExportedConfigWithProps) => {
  return withXcodeProject(c, (config) => {
    config.modResults = setExcludedArchitectures(config.modResults);
    return config;
  });
};

function isWatermelonDBInstalled(projectRoot: string) {
  const resolved = resolveFrom.silent(
    projectRoot,
    "@nozbe/watermelondb/package.json"
  );
  return resolved ? path.dirname(resolved) : null;
}

function getPlatformProjectFilePath(
  config: ExportedConfigWithProps,
  fileName: string
) {
  const projectName =
    config.modRequest.projectName || config.name.replace(/[- ]/g, "");
  return path.join(
    config.modRequest.platformProjectRoot,
    projectName,
    fileName
  );
}

// @ts-ignore
export default (config, options) => {
  // config = setAppSettingBuildGradle(config);
  // config = setAppBuildGradle(config);
  config = setAndroidMainApplication(config);
  config = setAppDelegate(config);
  config = setWmelonBridgingHeader(config);
  config = withCocoaPods(config);
  if (options?.excludeSimulatorArchitectures ?? true) {
    config = withExcludedSimulatorArchitectures(config);
  }
  return config;
};

<script lang="ts">
    'use strict';
    //https://www.npmjs.com/package/s2-geometry?activeTab=readme

    import { setContext } from 'svelte';
    import { get, writable, type Writable } from 'svelte/store';
    import { peerIdStr,  recentLocalisation } from '../../../stateStore';
    import { Vec3, Quat, type Transform } from 'ogl';
    import { createEventDispatcher } from 'svelte';

    import ArCloudOverlay from '@components/dom-overlays/ArCloudOverlay.svelte';
    import Parent from '@components/Viewer.svelte';
    import type webxr from '../../../core/engines/webxr';
    import type ogl from '../../../core/engines/ogl/ogl';
    import { S2 } from 's2-geometry'; // this has no TypeScript types, but it still works
    import MinecraftOverlay from './MinecraftOverlay.svelte';
    import { getAutomergeDocumentData } from '../../../core/p2pnetwork';
    import { GEOPOSE } from '@src/core/common';
    import { GeoPoseRequest } from '@oarc/gpp-access';
    import type { forEach } from 'lodash';
    //import { spawn } from 'child_process';

    //We are using level 24 because it is approximately 0.5m in sidelength
    let dimension = 0;
    let S2_LEVEL = 24;
    const S2BaseLevel = 24;
    let parentInstance: Parent;
    let xrEngine: webxr;
    let tdEngine: ogl;
    let settings: Writable<Record<string, unknown>> = writable({});
    let reticle: Transform | null = null; // TODO: Mesh instead of Transform
    let experimentIntervalId: ReturnType<typeof setInterval> | undefined;
    let doExperimentAutoPlacement = false;
    let hitTestSource: XRHitTestSource | undefined;
    let minecraftOverlay: MinecraftOverlay;
    let parentState = writable<{ hasLostTracking: boolean; isLocalized: boolean; localisation: boolean; isLocalisationDone: boolean; showFooter: boolean }>();
    let intervalId: any
    let log: Block;
    let grass: Block;
    //let plank: Block;
    let dirt: Block;
    let stone: Block;
    let cobblestone: Block;
    let chosenBlock: Block;
    let models : any[] = [];
    let previousID = 0;
    
    const dispatch = createEventDispatcher<{ broadcast: { event: string; value: any; routing_key?: string } }>();
    
    setContext('state', parentState);

    $: {
        if ($recentLocalisation?.geopose.position != null) {
            const assets = getAutomergeDocumentData();
            if (assets) {
                for (const asset of assets) {
                    onNetworkEvent({ object_created: asset });
                }
            }
        }
    }

    function initializeBlocks() {
        grass = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/grass%20block_0.5.glb', 'grass', 1, 'Balazs', new Date());
        dirt = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/dirt_new_0.5.glb', 'dirt', 2, 'Balazs', new Date());
        log = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/log_0.5.glb', 'log', 3, 'Balazs', new Date());
        //plank = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/plank_0.5.glb', 'plank', 4, 'Balazs', new Date());
        stone = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/stone_0.5.glb', 'stone', 5, 'Balazs', new Date());
        cobblestone = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/cobblestone_0.5.glb', 'cobblestone', 6, 'Balazs', new Date());

        chosenBlock = grass;
    }

    /**
     * Initial setup.
     *
     * @param thisWebxr  class instance     Handler class for WebXR
     * @param this3dEngine  class instance      Handler class for 3D processing
     * @param options  { settings }       Options provided by the app. Currently contains the settings from the Dashboard
     */
    export function startAr(thisWebxr: webxr, this3dEngine: ogl, options?: { settings?: Writable<Record<string, unknown>> }) {
        parentInstance.startAr(thisWebxr, this3dEngine);
        xrEngine = thisWebxr;
        tdEngine = this3dEngine;

        if (options?.settings) {
            settings = options?.settings;
        }

        startSession();
        initializeBlocks();
        //intervalId = setInterval(() => getPoints(reticle), 500);
        
    }

    /**
     * Setup required AR features and start the XRSession.
     */
    async function startSession() {
        await parentInstance.startSession(
            onXrFrameUpdate,
            onXrSessionEnded,
            onXrNoPose,
            (xr, result, gl) => {
                if (gl) {
                    xr.glBinding = new XRWebGLBinding(result, gl);
                    xr.initCameraCapture(gl);
                }

                result
                    .requestReferenceSpace('viewer')
                    .then((refSpace) => result.requestHitTestSource?.({ space: refSpace }))
                    .then((source) => (hitTestSource = source));
            },
            ['dom-overlay', 'camera-access', 'anchors', 'hit-test', 'local-floor'],
            [],
        );

        tdEngine.setExperimentTapHandler(experimentTapHandler);
    }

    /**
     * Handles update loop when AR Cloud mode is used.
     *
     * @param time  DOMHighResTimeStamp     time offset at which the updated
     *      viewer state was received from the WebXR device.
     * @param frame     The XRFrame provided to the update loop
     * @param floorPose The pose of the device as reported by the XRFrame
     */
    function onXrFrameUpdate(time: DOMHighResTimeStamp, frame: XRFrame, floorPose: XRViewerPose, floorSpaceReference: XRSpace) {
        parentInstance.handlePoseHeartbeat();

        if (!hitTestSource) {
            parentInstance.onXrFrameUpdate(time, frame, floorPose);
            return;
        }

        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
            if ($settings.localisation && !$parentState.isLocalized) {
                parentInstance.onXrFrameUpdate(time, frame, floorPose);
            } else {
                $parentState.showFooter = ($settings.showstats || ($settings.localisation && !$parentState.isLocalisationDone)) as boolean;
                if (reticle === null) {
                    reticle = tdEngine.addReticle();
                    intervalId = setInterval(() => getPoints(reticle), 500);
                }
                const reticlePose = hitTestResults[0].getPose(floorSpaceReference);
                const position = reticlePose?.transform.position;
                const orientation = reticlePose?.transform.orientation;
                if (position && orientation) {
                    tdEngine.updateReticlePose(reticle, new Vec3(position.x, position.y, position.z), new Quat(orientation.x, orientation.y, orientation.z, orientation.w));
                }
            }
        }

        xrEngine.setViewportForView(floorPose.views[0]);
        tdEngine.render(time, floorPose.views[0]);
    }

    /**
     * Let's the app know that the XRSession was closed.
     */
    function onXrSessionEnded() {
        parentInstance.onXrSessionEnded();
        if (hitTestSource != undefined) {
            hitTestSource.cancel();
            hitTestSource = undefined;
        }
        if (experimentIntervalId) {
            clearInterval(experimentIntervalId);
            experimentIntervalId = undefined;
        }
        parentInstance.onXrSessionEnded();
    }

    /**
     * Called when no pose was reported from WebXR.
     *
     * @param time  DOMHighResTimeStamp     time offset at which the updated
     *      viewer state was received from the WebXR device.
     * @param frame  XRFrame        The XRFrame provided to the update loop
     * @param floorPose  XRPose     The pose of the device as reported by the XRFrame
     */
    function onXrNoPose(time: DOMHighResTimeStamp, frame: XRFrame, floorPose: XRViewerPose) {
        parentInstance.onXrNoPose(time, frame, floorPose);
    }

    class Block {
        private url: string;
        private type: string;
        private id: number;
        private author: string;
        private timestamp: Date;

        constructor(url: string, type: string, id: number, author: string, timestamp: Date) {
            (this.url = url), (this.type = type), (this.id = id), (this.author = author), (this.timestamp = timestamp);
        }

        getUrl(): string {
            return this.url;
        }

        getId(): number {
            return this.id;
        }
    }

    class Cell {
        s2cell_id: number;
        height: number;
        content: {
            blocks: any[];
        };

        // Creates the initial values for our cell, the id of the s2 cell, the height (number of blocks on top of each other, and the types of blocks used)
        constructor(id: number) {
            this.s2cell_id = id;
            this.height = 0;
            this.content = {
                blocks: [],
            };
        }

        getHeight(): number {
            return this.height;
        }

        // Increases the height of the blocks by one
        increaseHeight(): void {
            this.height++;
        }

        // returns the id of the s2 cell
        getId(): number {
            return this.s2cell_id;
        }

        addBlock(minecraft_block: Block) {
            this.content.blocks[this.content.blocks.length] = minecraft_block;
        }
    }

    // Cell map
    let cellMap: Map<number, Cell> = new Map();

    function newBlock(latitude: number, longitude: number, block: Block): void {
        // Get the id of the S2 cell on level 24 (S2_LEVEL)
        let key = S2.latLngToKey(latitude, longitude, S2_LEVEL);
        let id = S2.keyToId(key);

        // Find the cell with the id
        let current_cell: any = cellMap.get(id);

        if (current_cell) {
        } else {
            //if we doesn't have content in that cell yet we create one
            current_cell = new Cell(id);
            cellMap.set(id, current_cell);
        }

        current_cell.addBlock(block); //chosen_block will come from user interaction

        //must get the lat and lon of the s2 cell, not the arguments
        const latlng = S2.idToLatLng(id);
        let cellLatitude = latlng.lat;
        let cellLongitude = latlng.lng;
        console.log(cellLatitude);
        console.log(latlng);
        let height = (0.5 / 2 ** dimension) * current_cell.getHeight();
        let scr = CreateSCR(cellLatitude, cellLongitude, height, block.getUrl(), block.getId());
        let size = 1 / 2 ** dimension;
        //parentInstance.placeContent([[scr]]);
        console.log('block created');

        /*let quat = toQuaternion(-1 * cellLongitude);

        let globalpose = {
            position: {
                lat: cellLatitude,
                lon: cellLongitude,
                h: height,
            },
            quaternion: {
                x: quat.qX,
                y: quat.qY,
                z: quat.qZ,
                w: quat.qW,
            },
        };

        const localpose = tdEngine.convertGeoPoseToLocalPose(globalpose);

        tdEngine.addModel(chosenBlock.get_url(), localpose.position, localpose.quaternion, new Vec3(size, size, size));*/

        current_cell.increaseHeight();

        const message_body = {
            scr: scr,
            sender: $peerIdStr,
            timestamp: new Date().getTime(),
        };

        dispatch('broadcast', {
            event: 'object_created', // TODO: should be unique to the object instance or just to the creation event?
            value: message_body,
        });
        //showPoints(latitude, longitude);
    }

    /**
     * There might be the case that a tap handler for off object taps. This is the place to handle that.
     *
     * Not meant for other usage than that.
     *
     * @param event  Event      The Javascript event object
     * @param auto  boolean     true when called from automatic placement interval
     */
    function experimentTapHandler() {
        if ($parentState.hasLostTracking == false && reticle != null) {
            //NOTE: ISMAR2021 experiment:
            // keep track of last localization (global and local)
            // when tapped, determine the global position of the tap, and save the global location of the object
            // create SCR from the object and share it with the others
            // when received, place the same way as a downloaded SCR.
            if ($parentState.isLocalisationDone) {
                const globalObjectPose = tdEngine.convertLocalPoseToGeoPose(reticle.position, reticle.quaternion);
                const latitude = globalObjectPose.position.lat;
                const longitude = globalObjectPose.position.lon;
                newBlock(latitude, longitude, chosenBlock);
            }
        }
    }

    /**
     * Toggle automatic placement of placeholders for experiment mode.
     */
    function toggleExperimentalPlacement() {
        doExperimentAutoPlacement = !doExperimentAutoPlacement;
        console.log('button pressed');

        if (doExperimentAutoPlacement) {
            experimentIntervalId = setInterval(() => experimentTapHandler(), 1000);
        } else {
            clearInterval(experimentIntervalId);
        }
    }
    //takes in the longitude as rotation angle on the up axis and turns it into quaternions
    function toQuaternion(longitude: number): any {
        const cr: number = Math.cos(0 * 0.5);
        const sr: number = Math.sin(0 * 0.5);
        const cp: number = Math.cos(0 * 0.5);
        const sp: number = Math.sin(0 * 0.5);
        const cy: number = Math.cos(((longitude * Math.PI) / 180) * 0.5);
        const sy: number = Math.sin(((longitude * Math.PI) / 180) * 0.5);

        const qW: number = cr * cp * cy + sr * sp * sy;
        const qX: number = sr * cp * cy - cr * sp * sy;
        const qY: number = cr * sp * cy + sr * cp * sy;
        const qZ: number = cr * cp * sy - sr * sp * cy;

        return { qW, qX, qY, qZ };
    }

    // NOTE: this won't actually write into the database, it just creates an SCR locally
    function CreateSCR(latitude: number, longitude: number, height: number, url: string, id: number): any {

        const quat = toQuaternion(-1 * longitude);

        const geoPose = {
            position: {
                lat: latitude,
                lon: longitude,
                h: height,
            },
            quaternion: {
                x: quat.qX,
                y: quat.qY,
                z: quat.qZ,
                w: quat.qW,
            },
        };

        const ref = {
            contentType: 'model/gltf-binary',
            url: url,
        };

        const content = {
            id: 'bme_block ' + id,
            type: 'MODEL_3D', //high-level OSCP type
            title: 'minecraft dirt block',
            refs: [ref],
            geopose: geoPose,
            size: 0.5,
        };

        const timestamp = new Date().getTime();
        const scr = {
            content: content,
            id: content.id,
            tenant: 'minecraft_experiment',
            type: 'scr',
            timestamp: timestamp,
        };

        return scr;
    }

    function relocalize() {
        parentInstance.relocalize();
        reticle = null;
    }

    function chooseBlock(blocktype: string) {
        switch (blocktype) {
            case 'log':
                chosenBlock = log;
                break;
            case 'grass':
                chosenBlock = grass;
                break;
            case 'dirt':
                chosenBlock = dirt;
                break;
            case 'stone':
                chosenBlock = stone;
                break;
            case 'cobblestone':
                chosenBlock = cobblestone;
                break;
            default:
                chosenBlock = cobblestone;
                break;
        }
    }

    function changeDimensions() {
        //Only can be used when not using fixated model sizes
        /*if (dimension >= 1) {
            dimension = 0;
        }

        dimension++;
        S2_LEVEL = S2BaseLevel + dimension;*/
    }

    export function onNetworkEvent(events: any,) {
        if (!('message_broadcasted' in events) && !('object_created' in events)) {
            console.log('Minecraft viewer: Unknown event received:');
            console.log(events);
            // pass on to parent
            return parentInstance.onNetworkEvent(events);
        }

        if (get(recentLocalisation)?.geopose?.position == undefined) {
            // we need to localize at least once to be able to do anything
            console.log('Network event received but we are not localized yet!');
            console.log(events);
            return;
        }

        if ('message_broadcasted' in events) {
            const data = events.message_broadcasted;
            //if (data.sender != $peerIdStr) { // ignore own messages which are also delivered
            if ('message' in data && 'sender' in data) {
                console.log('message from ' + data.sender + ': \n  ' + data.message);
            }
            //}
        }

        if ('object_created' in events) {
            const data = events.object_created;
            //if (data.sender != $peerIdStr) { // ignore own messages which are also delivered
            const scr = data.scr;
            if ('tenant' in scr && scr.tenant === 'minecraft_experiment') {
                parentInstance.placeContent([[scr]]); // WARNING: wrap into an array
            }
            //}
        }
    }

    function getPoints(reticle: any){

    const globalObjectPose = tdEngine.convertLocalPoseToGeoPose(reticle.position, reticle.quaternion);
    const latitude = globalObjectPose.position.lat;
    const longitude = globalObjectPose.position.lon;

    let key = S2.latLngToKey(latitude, longitude, S2_LEVEL);
    let id = S2.keyToId(key);
    if(id != previousID){
    previousID = id;
    const latlng = S2.idToLatLng(id);
    let cellLatitude = latlng.lat;
    let cellLongitude = latlng.lng;
    
    if(models.length > 0){
        models.forEach(function(element){
            tdEngine.remove(element);
        });
    }

    models = [];


    const url = 'https://esoptron.hu:8042/getPoints?lat=' + cellLatitude + '&lon=' + cellLongitude + '&lvl=24'

    if ($parentState.hasLostTracking == false && reticle != null) {
        if ($parentState.isLocalisationDone) {
            fetch(url)
            .then(response => {
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
    })
    .then(data => {
      console.log("API response:", data);

      let v0 = {
        lat: data.v0lat,
        lon: data.v0lon
      }
      let v1 = {
        lat: data.v1lat,
        lon: data.v1lon
      }
      let v2 = {
        lat: data.v2lat,
        lon: data.v2lon
      }
      let v3 = {
        lat: data.v3lat,
        lon: data.v3lon
      }

      let points = [v0, v1, v2, v3]

      points.forEach(function(element){
        let quat = toQuaternion(-1 * element.lon);

        let globalpose = {
            position: {
                lat: element.lat,
                lon: element.lon,
                h: 0,
            },
            quaternion: {
                x: quat.qX,
                y: quat.qY,
                z: quat.qZ,
                w: quat.qW,
            },
        };

        const localpose = tdEngine.convertGeoPoseToLocalPose(globalpose);

        let model = tdEngine.addModel(chosenBlock.getUrl(), localpose.position, localpose.quaternion, new Vec3(0.1, 0.1, 0.1));
        models.push(model);

      });

    })
    .catch(error => {
      console.error("Error:", error);
    });
}
}
}
    }

</script>

<Parent bind:this={parentInstance} on:arSessionEnded>
    <svelte:fragment slot="overlay" let:isLocalizing let:isLocalized let:isLocalisationDone let:firstPoseReceived>
        {#if $settings.localisation && !isLocalisationDone}
            <ArCloudOverlay hasPose={firstPoseReceived} {isLocalizing} {isLocalized} on:startLocalisation={() => parentInstance.startLocalisation()} />
        {:else}
            <MinecraftOverlay
                bind:this={minecraftOverlay}
                on:relocalize={() => relocalize()}
                on:log={() => chooseBlock('log')}
                on:grass={() => chooseBlock('grass')}
                on:plank={() => chooseBlock('plank')}
                on:dirt={() => chooseBlock('dirt')}
                on:stone={() => chooseBlock('stone')}
                on:cobblestone={() => chooseBlock('cobblestone')}
            />
        {/if}
    </svelte:fragment>
</Parent>

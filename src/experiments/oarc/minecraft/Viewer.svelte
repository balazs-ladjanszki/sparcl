<script lang="ts">
    'use strict';
    //https://www.npmjs.com/package/s2-geometry?activeTab=readme

    import { setContext } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import ArCloudOverlay from '@components/dom-overlays/ArCloudOverlay.svelte';
    import Parent from '@components/Viewer.svelte';
    import type webxr from '../../../core/engines/webxr';
    import type ogl from '../../../core/engines/ogl/ogl';
    const S2 = require('s2-geometry').S2;
    //We are using level 24 because it is approximately 0.5m in sidelength
    const S2_LEVEL = 24;
    let parentInstance: Parent;
    let xrEngine: webxr;
    let tdEngine: ogl;
    let settings: Writable<Record<string, unknown>> = writable({});

    let parentState = writable();
    setContext('state', parentState);

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
    }

    /**
     * Setup required AR features and start the XRSession.
     */
     async function startSession() {
        await parentInstance.startSession(
            onXrFrameUpdate,
            onXrSessionEnded,
            onXrNoPose,
            (xr, session, gl) => {
                if (gl) {
                    xr.glBinding = new XRWebGLBinding(session, gl);
                    xr.initCameraCapture(gl);
                }
                session.requestReferenceSpace('viewer');
            },
            ['dom-overlay', 'camera-access', 'local-floor'],
        );
    }

    /**
     * Handles update loop when AR Cloud mode is used.
     *
     * @param time  DOMHighResTimeStamp     time offset at which the updated
     *      viewer state was received from the WebXR device.
     * @param frame     The XRFrame provided to the update loop
     * @param floorPose The pose of the device as reported by the XRFrame
     */
     function onXrFrameUpdate(time: DOMHighResTimeStamp, frame: XRFrame, floorPose: XRViewerPose) {
        parentInstance.onXrFrameUpdate(time, frame, floorPose);
    }

    /**
     * Let's the app know that the XRSession was closed.
     */
    function onXrSessionEnded() {
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

        get_url(): string {
            return this.url;
        }
    }

    class Cell {
        s2cell_id: number;
        height: number;
        content: {
            height_offset: number;
            blocks: any[];
        };

        // Creates the initial values for our cell, the id of the s2 cell, the height (number of blocks on top of each other, and the types of blocks used)
        constructor(id: number) {
            this.s2cell_id = id;
            this.height = 0;
            this.content = {
                height_offset: 0,
                blocks: [],
            };
        }

        get_height(): number {
            return this.height;
        }

        // Increases the height of the blocks by one
        increase_height(): void {
            this.height++;
        }

        // returns the id of the s2 cell
        get_id(): number {
            return this.s2cell_id;
        }

        add_Block(minecraft_block: Block) {
            this.content.blocks[this.content.blocks.length] = minecraft_block;
        }
    }

    // Cell map
    let cellMap: Map<number, Cell> = new Map();

    function New_Block(latitude: number, longitude: number, block: Block): void {
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

        current_cell.add_Block(block); //chosen_block will come from user interaction
        current_cell.increase_height();
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

    function CreateSCD(latitude: number, longitude: number, height: number, url: string, id: number): any {
        //SCR

        const quat = toQuaternion(longitude);

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
            object_description: 'object_description',
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

    //Hardcoded blocks

    let Block1 = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/grass%20block_0.5.glb', 'grass', 1, 'Balazs', new Date());
    let Block2 = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/grass%20block_0.5.glb', 'grass', 2, 'Balazs', new Date());
    let Block3 = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/grass%20block_0.5.glb', 'grass', 3, 'Balazs', new Date());
    let Block4 = new Block('https://raw.githubusercontent.com/balazs-ladjanszki/3d/main/grass%20block_0.5.glb', 'grass', 4, 'Balazs', new Date());

    //1:47.47264089476975, 19.05938926889718
    //2:47.47262570711014, 19.05940261618721
    //3:47.47261194465591, 19.05942227834729
    New_Block(47.47264089476975, 19.05938926889718, Block1);
    New_Block(47.47262570711014, 19.05940261618721, Block2);
    New_Block(47.47261194465591, 19.05942227834729, Block3);
    New_Block(47.47261194465591, 19.05942227834729, Block4);

    cellMap.forEach((cell, id) => {
        let cellid = cell.get_id();
        let latlng = S2.idToLatLng(cellid);
        for (let i = 0; i < cell.content.blocks.length; i++) {

            const latitude = latlng.lat;
            const longitude = latlng.lng;
            const height = 0.5 * cell.get_height();
            const url = cell.content.blocks[i].get_url();

            let scr = CreateSCD(latitude,longitude,height,url,i);

            parentInstance.placeContent([[scr]]);
        }
    });
</script>

<Parent bind:this={parentInstance} on:arSessionEnded>
    <svelte:fragment slot="overlay" let:isLocalizing let:isLocalized let:isLocalisationDone let:firstPoseReceived>
        {#if $settings.localisation && !isLocalisationDone}
            <ArCloudOverlay hasPose={firstPoseReceived} {isLocalizing} {isLocalized} on:startLocalisation={() => parentInstance.startLocalisation()} />
        {/if}
    </svelte:fragment>
</Parent>

package com.chipcolate.tesserone.wear

import com.chipcolate.tesserone.CompanionSurfaces
import com.chipcolate.tesserone.core.wear.WearPaths
import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.WearableListenerService

class PhoneWearListenerService : WearableListenerService() {
    override fun onMessageReceived(messageEvent: MessageEvent) {
        if (messageEvent.path == WearPaths.REQUEST_SYNC) {
            CompanionSurfaces.onWalletChanged(this, forceLogos = true)
        }
    }

    override fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
        if (capabilityInfo.nodes.isNotEmpty()) {
            CompanionSurfaces.onWalletChanged(this, forceLogos = true)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onPeerConnected(peer: Node) {
        CompanionSurfaces.onWalletChanged(this, forceLogos = true)
    }
}

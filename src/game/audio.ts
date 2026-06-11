type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

export class TowerAudio {
  private context: AudioContext | null = null
  private unlocked = false

  unlock(): void {
    if (this.unlocked) {
      return
    }
    const audioWindow = window as AudioWindow
    const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
    if (!Context) {
      return
    }
    this.context = new Context()
    void this.context.resume()
    this.unlocked = true
  }

  playScrollClank(): void {
    if (!this.context) {
      return
    }

    const now = this.context.currentTime
    const master = this.context.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.025)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
    master.connect(this.context.destination)

    for (let index = 0; index < 4; index += 1) {
      const osc = this.context.createOscillator()
      const gain = this.context.createGain()
      osc.type = index % 2 === 0 ? 'sawtooth' : 'square'
      osc.frequency.setValueAtTime(92 - index * 13, now + index * 0.045)
      gain.gain.setValueAtTime(0.0001, now + index * 0.045)
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.02 + index * 0.045)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 + index * 0.045)
      osc.connect(gain)
      gain.connect(master)
      osc.start(now + index * 0.045)
      osc.stop(now + 0.22 + index * 0.045)
    }

    const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.22, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length)
    }
    const noise = this.context.createBufferSource()
    const noiseGain = this.context.createGain()
    noise.buffer = buffer
    noiseGain.gain.setValueAtTime(0.14, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    noise.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
  }
}

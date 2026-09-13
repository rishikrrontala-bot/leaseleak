"""Mix narration clips onto the recording at their cue times → demo/out/leaseleak-demo.mp4.
Usage: python3 demo/mix.py [--voice-dir demo/audio]   (re-record clips as 01.aiff … 08.aiff to swap voices)
"""
import json, subprocess, sys, os
FF = 'node_modules/ffmpeg-static/ffmpeg'
voice_dir = sys.argv[sys.argv.index('--voice-dir') + 1] if '--voice-dir' in sys.argv else 'demo/audio'
cues = json.load(open('demo/out/cues.json'))
inputs = ['-i', 'demo/out/leaseleak-demo.webm']
filters = []; mixes = []
for i, c in enumerate(cues['cues']):
    f = os.path.join(voice_dir, f"{c['id']}.aiff")
    inputs += ['-i', f]
    ms = int(c['at'] * 1000)
    filters.append(f"[{i+1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms}[a{i}]")
    mixes.append(f"[a{i}]")
n = len(mixes)
fc = ';'.join(filters) + f";{''.join(mixes)}amix=inputs={n}:normalize=0:dropout_transition=0,volume=1.0,apad=whole_dur={cues['total']:.2f}[aout]"
cmd = [FF, '-y', '-loglevel', 'error'] + inputs + ['-filter_complex', fc, '-map', '0:v', '-map', '[aout]',
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart',
       '-c:a', 'aac', '-b:a', '160k', '-shortest', 'demo/out/leaseleak-demo.mp4']
subprocess.run(cmd, check=True)
print('wrote demo/out/leaseleak-demo.mp4')

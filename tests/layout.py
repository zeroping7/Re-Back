import json,sys
from PIL import Image, ImageDraw
names=sys.argv[1:]
ims=[]
for n in names:
    d=json.load(open(f'/tmp/{n}.json')); S=d['S']; W=d['W']; bx,bz=d['box']
    k=5; im=Image.new('RGB',(int(bx*2*k),int(bz*2*k)),(240,230,210)); g=ImageDraw.Draw(im)
    P=lambda x,z:((x+bx)*k,(z+bz)*k)
    for x,z in S: g.ellipse([P(x-W/2,z-W/2),P(x+W/2,z+W/2)],fill=(120,120,130))
    for i,(x,z) in enumerate(S):
        x2,z2=S[(i+1)%len(S)]; g.line([P(x,z),P(x2,z2)],fill=(255,255,255),width=1)
    g.ellipse([P(S[0][0]-1,S[0][1]-1),P(S[0][0]+1,S[0][1]+1)],fill=(255,0,0))
    for x in range(-int(bx),int(bx)+1,10): g.line([P(x,-bz),P(x,bz)],fill=(200,190,170))
    for z in range(-int(bz),int(bz)+1,10): g.line([P(-bx,z),P(bx,z)],fill=(200,190,170))
    ims.append(im)
W=max(i.width for i in ims); H=sum(i.height for i in ims)
out=Image.new('RGB',(W,H),(0,0,0)); y=0
for i in ims: out.paste(i,(0,y)); y+=i.height
out.save('/tmp/layout.png')

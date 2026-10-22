# one pose at a time; on the free-quota error wait 10 min and retry the same pose; give up after 4 h
K="Keep the identical face, fur colour, brown fedora hat, brown coat, fingerless gloves, cream shirt, belt with gold buckle, shoulder bag, body proportions, line art and cartoon style. Full body, centred, plain white background, no shadow."
W="Keep the identical face, fur colour, yellow hard hat, orange high-visibility safety vest, beige work shirt, brown work trousers, brown boots, tan gloves, body proportions, line art and cartoon style. Full body, centred, plain white background, no shadow."
end=$((SECONDS + 4 * 3600))
try() { # name ref prompt
  while [ $SECONDS -lt $end ]; do
    [ -s "$1.png" ] && return 0
    r=$(node gen.mjs "$2" "$1.png" 7 "$3" 2>&1 | tail -1); echo "$(date +%H:%M) $1: $r"
    case "$r" in ok*) return 0;; *ZeroGPU*|*quota*|*limit*) sleep 600;; *) sleep 120;; esac
  done; return 1; }
try w-stand ref-deal.png "Change only the clothes of this exact same capybara character into a warehouse worker outfit: a yellow hard hat instead of the fedora, an orange high-visibility safety vest with a silver reflective stripe over a beige work shirt, brown work trousers, brown work boots and tan work gloves, no bag. He stands and gives a thumbs up. Keep the identical face, fur colour, body proportions, line art and cartoon style. Full body, centred, plain white background, no shadow."
[ -s w-stand.png ] && node img.mjs prep w-stand.png ref-worker.png 1024 >/dev/null 2>&1
try w-carry ref-worker.png "Make this exact same worker capybara carry a big brown cardboard box in both arms in front of his chest, walking to the right. $W"
try w-shock ref-worker.png "Make this exact same worker capybara look shocked, pointing up with one hand at an alarm above him, eyes wide, mouth open. $W"
try m-run ref-deal.png "Make this exact same capybara character run fast towards the right, mid-stride, one leg forward, arms pumping, determined face, three-quarter view facing right. $K"
try m-stamp ref-deal.png "Make this exact same capybara character press a big wooden rubber stamp down in front of him with one hand, approving, confident nod. $K"
try m-receive ref-deal.png "Make this exact same capybara character hold both open hands forward palms up, ready to receive something, happy face. $K"
try m-cheer ref-deal.png "Make this exact same capybara character celebrate with both arms raised high above the head, big open-mouth smile, eyes happy. $K"
try w-wave ref-worker.png "Make this exact same worker capybara wave both arms to guide a truck in, friendly face. $W"
echo "$(date +%H:%M) retry loop finished"

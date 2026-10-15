public class Es_1_3 {
    public static void main(String args[]){
        String[] array = {"2Bianchi","122B","654322","Rossi"};
        for(int j = 0; j < 4; j++){
            String str = array[j];
            int state = 0;
            int i = 0;
            while(state >= 0 && i<str.length()){
                final char ch = str.charAt(i++);
                switch(state){
                    case 0:
                        if(Character.valueOf(ch)%2==0){
                            state = 3;
                        }else if(Character.valueOf(ch)%2==1){
                            state = 2;
                        }else if(Character.isLetter(ch))
                            state = 1;
                        else
                            state = -1;
                    break;
                    case 1:
                        state = -1;
                    break;
                    case 2:
                        if(Character.toLowerCase(ch) >= 'l' && Character.toLowerCase(ch) <= 'z'){
                            state = 4;
                        }else if(Character.valueOf(ch)%2==0 && Character.isDigit(ch)){
                            state = 3;
                        }else if(Character.valueOf(ch)%2==1 && Character.isDigit(ch)){
                        }else if(Character.toLowerCase(ch) >= 'a' && Character.toLowerCase(ch) <= 'k'){
                            state = 1;
                        }else
                            state = -1;
                    break;
                    case 3:
                        if(Character.toLowerCase(ch) >= 'l' && Character.toLowerCase(ch) <= 'z'){
                            state = 1;
                        }else if(Character.valueOf(ch)%2==1 && Character.isDigit(ch)){
                            state = 2;
                        }else if(Character.valueOf(ch)%2==0 && Character.isDigit(ch)){
                        }else if(Character.toLowerCase(ch) >= 'a' && Character.toLowerCase(ch) <= 'k'){
                            state = 4;
                        }else
                            state = -1;
                    break;
                    case 4:
                        if(Character.isDigit(ch)){
                            state = 1;
                        }
                    break;
                }
            }
            System.out.println("[" + array[j] + "] " + "-> " + (state == 4));
        }
    }
}

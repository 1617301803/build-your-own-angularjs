
import { Scope } from '../src/Scope';
import { expect } from './expect';

let parent,
    scope,
    child,
    isolatedChild;

parent = new Scope();
scope = parent.$new();
child = scope.$new();
isolatedChild = scope.$new(true);

let listener = function(){
    
};
scope.$on('$destroy', listener);

scope.$destroy();

expect(listener).toHaveBeenCalled();

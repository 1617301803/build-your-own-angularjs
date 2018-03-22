
import { Scope } from './Scope';
import { expect } from './expect';

let parent = new Scope();
let child = parent.$new(true);

child.$$postDigest((scope) => {
    scope.didPostDigest = true;
});

parent.$digest();
expect(child.didPostDigest).toBe(true);